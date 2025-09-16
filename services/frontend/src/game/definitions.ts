export const __speed__ = 5;
export const __friction__ = 0.1;

export interface Vector {
    x: number,
    y: number
}

export interface Bounds{
    top: number;
    bottom: number;
    left: number;
    right: number;
}