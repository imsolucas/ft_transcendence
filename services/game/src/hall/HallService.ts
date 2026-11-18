import type { Server, Socket } from 'socket.io';
import type { FastifyBaseLogger } from 'fastify';
import type {
	HallEmoteShownMessage,
	HallPlayerJoinedMessage,
	HallPlayerLeftMessage,
	HallPlayerView,
	HallSnapshotMessage,
	HallWelcomeMessage,
} from 'shared';
import { HALL_CAPACITY, HALL_EMOTES, HALL_SIM_HZ, HALL_SNAPSHOT_HZ, moveInHall, spawnPoint, type HallEmote } from 'shared/hall/hall.ts';
import type { AuthenticatedUser } from '../auth/usersClient.ts';

/** one emote per player per this long */
const EMOTE_COOLDOWN_MS = 1500;
/** a re-join (after leaving) waits this long, so join/leave can't be spammed at everyone */
const JOIN_COOLDOWN_MS = 1000;
/** a held direction is re-sent every second; silence this long means the tab went away: stop */
const INPUT_TIMEOUT_MS = 3000;

interface Member {
	view: HallPlayerView;
	bits: number;
	lastInput: number;
	moving: boolean;
	/** a player can have the hall open in a few tabs: one avatar, many sockets */
	sockets: Set<string>;
	lastEmote: number;
}

const room = (instance: number) => `hall:${instance}`;
const round = (n: number) => Math.round(n * 10) / 10;

/**
 * The arcade hall (services/shared/hall/hall.ts). Copies of the room hold up to HALL_CAPACITY
 * players each; a new player goes to the fullest copy that still has space, so the hall feels
 * busy. Movement is simulated here from input bits at HALL_SIM_HZ and broadcast per copy (one
 * Socket.IO room each) at HALL_SNAPSHOT_HZ. Nothing here is persisted.
 */
export class HallService {
	private halls = new Map<number, Map<string, Member>>();
	private where = new Map<string, number>();
	private lastLeft = new Map<string, number>();
	/** sockets with a delayed join scheduled (one each) */
	private pendingJoin = new Set<string>();
	private io: Server;
	private log: FastifyBaseLogger;

	constructor(io: Server, log: FastifyBaseLogger) {
		this.io = io;
		this.log = log;
		setInterval(() => this.simulate(1 / HALL_SIM_HZ), 1000 / HALL_SIM_HZ).unref();
		setInterval(() => this.broadcastSnapshots(), 1000 / HALL_SNAPSHOT_HZ).unref();
	}

	private send(target: Socket | string, msg: { type: string; data: unknown }) {
		const json = JSON.stringify({ ...msg, timestamp: Date.now() });
		if (typeof target === 'string') this.io.to(target).emit('message', json);
		else target.emit('message', json);
	}

	private pickInstance(): number {
		let best: number | null = null;
		for (const [n, members] of this.halls) {
			if (members.size >= HALL_CAPACITY) continue;
			if (best === null || members.size > this.halls.get(best)!.size) best = n;
		}
		if (best !== null) return best;
		let n = 1;
		while (this.halls.has(n)) n++;
		this.halls.set(n, new Map());
		return n;
	}

	join(socket: Socket, user: AuthenticatedUser) {
		const id = String(user.id);
		let instance = this.where.get(id);
		let member = instance !== undefined ? this.halls.get(instance)?.get(id) : undefined;
		// this socket is already in: nothing to do (no second welcome on a repeated join)
		if (member?.sockets.has(socket.id)) return;
		if (instance === undefined || !member) {
			const wait = JOIN_COOLDOWN_MS - (Date.now() - (this.lastLeft.get(id) ?? 0));
			if (wait > 0) {
				// came straight back (or join/leave spam): join once the cooldown is over
				if (this.pendingJoin.has(socket.id)) return;
				this.pendingJoin.add(socket.id);
				setTimeout(() => {
					// a leave in the meantime cancelled it
					if (!this.pendingJoin.delete(socket.id)) return;
					if (socket.connected) this.join(socket, user);
				}, wait).unref();
				return;
			}
			instance = this.pickInstance();
			const members = this.halls.get(instance)!;
			const at = spawnPoint([...members.values()].map((m) => m.view));
			member = {
				view: { id, name: user.displayName || user.username, avatar: user.avatar, look: user.look, x: at.x, y: at.y, facing: at.facing },
				bits: 0,
				lastInput: 0,
				moving: false,
				sockets: new Set(),
				lastEmote: 0,
			};
			members.set(id, member);
			this.where.set(id, instance);
			const joined: HallPlayerJoinedMessage = { type: 'hallPlayerJoined', data: { player: member.view }, timestamp: 0 };
			socket.to(room(instance)).emit('message', JSON.stringify({ ...joined, timestamp: Date.now() }));
		}
		member.sockets.add(socket.id);
		void socket.join(room(instance));
		const members = this.halls.get(instance)!;
		const welcome: HallWelcomeMessage = {
			type: 'hallWelcome',
			data: { instance, you: id, players: [...members.values()].map((m) => m.view), capacity: HALL_CAPACITY },
			timestamp: 0,
		};
		this.send(socket, welcome);
	}

	input(socket: Socket, user: AuthenticatedUser, bits: unknown) {
		if (!Number.isInteger(bits) || (bits as number) < 0 || (bits as number) > 15) return;
		const member = this.member(socket, user);
		if (!member) return;
		member.bits = bits as number;
		member.lastInput = Date.now();
	}

	emote(socket: Socket, user: AuthenticatedUser, emote: unknown) {
		if (typeof emote !== 'string' || !(HALL_EMOTES as readonly string[]).includes(emote)) return;
		const member = this.member(socket, user);
		const instance = this.where.get(String(user.id));
		if (!member || instance === undefined) return;
		const now = Date.now();
		if (now - member.lastEmote < EMOTE_COOLDOWN_MS) return;
		member.lastEmote = now;
		const shown: HallEmoteShownMessage = { type: 'hallEmoteShown', data: { id: member.view.id, emote: emote as HallEmote }, timestamp: 0 };
		this.send(room(instance), shown);
	}

	/** this socket leaves (explicitly or by disconnecting); the avatar goes with the last one */
	leave(socket: Socket, user: AuthenticatedUser) {
		const id = String(user.id);
		this.pendingJoin.delete(socket.id);
		const instance = this.where.get(id);
		if (instance === undefined) return;
		const members = this.halls.get(instance);
		const member = members?.get(id);
		void socket.leave(room(instance));
		if (!members || !member) return;
		member.sockets.delete(socket.id);
		if (member.sockets.size > 0) return;
		members.delete(id);
		this.where.delete(id);
		this.lastLeft.set(id, Date.now());
		if (this.lastLeft.size > 5000) this.lastLeft.clear();
		const left: HallPlayerLeftMessage = { type: 'hallPlayerLeft', data: { id }, timestamp: 0 };
		this.send(room(instance), left);
		if (members.size === 0) this.halls.delete(instance);
		this.log.debug({ instance, players: members.size }, 'hall: player left');
	}

	/** the user's avatar, but only for a socket that joined the hall (not, say, a game tab) */
	private member(socket: Socket, user: AuthenticatedUser): Member | undefined {
		const id = String(user.id);
		const instance = this.where.get(id);
		const m = instance === undefined ? undefined : this.halls.get(instance)?.get(id);
		return m?.sockets.has(socket.id) ? m : undefined;
	}

	private simulate(dt: number) {
		const now = Date.now();
		for (const members of this.halls.values()) {
			for (const m of members.values()) {
				if (m.bits !== 0 && now - m.lastInput > INPUT_TIMEOUT_MS) m.bits = 0;
				if (m.bits === 0) {
					m.moving = false;
					continue;
				}
				const next = moveInHall(m.view, m.bits, dt);
				m.moving = next.x !== m.view.x || next.y !== m.view.y;
				m.view.x = next.x;
				m.view.y = next.y;
				m.view.facing = next.facing;
			}
		}
	}

	private broadcastSnapshots() {
		for (const [instance, members] of this.halls) {
			if (members.size === 0) continue;
			const snap: HallSnapshotMessage = {
				type: 'hallSnapshot',
				data: { p: [...members.values()].map((m) => [m.view.id, round(m.view.x), round(m.view.y), m.view.facing, m.moving ? 1 : 0]) },
				timestamp: 0,
			};
			this.send(room(instance), snap);
		}
	}
}
