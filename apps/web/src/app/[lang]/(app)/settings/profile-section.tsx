"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { Me } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form";
import { Avatar, Panel, Skeleton } from "@/components/ui/primitives";
import { LoadError, USERNAME_RE } from "./settings-ui";

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const AVATAR_MAX = 2 * 1024 * 1024;

export function ProfileSection() {
  const { me, isLoading, error, mutate: reload } = useMe();
  if (error) return <LoadError onRetry={() => reload()} />;
  if (isLoading || !me) return <ProfileSkeleton />;
  return <ProfileForm key={me.id} me={me} />;
}

function ProfileSkeleton() {
  return (
    <div className="stack stack-5" aria-hidden>
      <Panel className="stack stack-4">
        <Skeleton className="h-6 w-24" />
        <div className="row row-4">
          <Skeleton circle className="!h-24 !w-24" />
          <div className="stack stack-3 grow">
            <Skeleton className="h-10 w-64 max-w-full" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
        </div>
      </Panel>
      <Panel className="stack stack-4">
        <Skeleton className="h-6 w-24" />
        <div className="grid gap-3 md:grid-cols-2 md:gap-6">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-10 w-40" />
      </Panel>
    </div>
  );
}

function ProfileForm({ me }: { me: Me }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(me.displayName);
  const [nameError, setNameError] = useState<string>();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Release the preview's object URL when it is replaced or the form unmounts
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const trimmed = displayName.trim();
  const dirty = trimmed !== me.displayName || !!file;

  function validateName(value = trimmed) {
    const err = USERNAME_RE.test(value) ? undefined : t("auth.errors.invalidUsername");
    setNameError(err);
    return !err;
  }

  function pick(f: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    if (!AVATAR_TYPES.includes(f.type)) return setAvatarError(t("settings.avatarWrongType"));
    if (f.size > AVATAR_MAX) return setAvatarError(t("settings.avatarTooLarge"));
    setAvatarError(undefined);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function reset() {
    setDisplayName(me.displayName);
    setNameError(undefined);
    setAvatarError(undefined);
    setFile(null);
    setPreview(null);
  }

  function avatarMessage(err: unknown) {
    if (err instanceof ApiError && err.status === 413) return t("settings.avatarTooLarge");
    if (err instanceof ApiError && err.status === 415) return t("settings.avatarWrongType");
    return undefined;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!validateName()) return;
    setSaving(true);
    try {
      if (file) {
        try {
          await api.post<Me>("/api/me/avatar", formData(file));
          setFile(null);
          setPreview(null);
        } catch (err) {
          const msg = avatarMessage(err);
          if (msg) {
            setAvatarError(msg);
            return;
          }
          throw err;
        }
      }
      if (trimmed !== me.displayName) {
        try {
          await api.patch<Me>("/api/me", { displayName: trimmed });
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            setNameError(t("auth.errors.usernameTaken"));
            return;
          }
          throw err;
        }
      }
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 0 ? t("common.networkError") : t("common.error"));
    } finally {
      setSaving(false);
      await mutate("/api/me");
    }
  }

  async function resetToDefault() {
    setRemoving(true);
    setAvatarError(undefined);
    try {
      await api.del<Me>("/api/me/avatar");
      setFile(null);
      setPreview(null);
      await mutate("/api/me");
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <form className="stack stack-5" onSubmit={save} noValidate>
      <Panel className="stack stack-4" aria-labelledby="settings-avatar">
        <h2 className="t-heading" id="settings-avatar">
          {t("settings.avatar")}
        </h2>
        <div className="row row-4 wrap">
          <Avatar name={me.displayName} src={preview ?? me.avatar} size="xl" />
          <div className="stack stack-3">
            <input
              ref={fileRef}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <div className="row wrap">
              <Button type="button" onClick={() => fileRef.current?.click()} disabled={saving || removing}>
                <Upload className="ico" aria-hidden />
                {t("settings.uploadAvatar")}
              </Button>
              <Button type="button" variant="ghost" onClick={resetToDefault} loading={removing} disabled={saving || (!me.avatar && !file)}>
                {removing ? t("common.saving") : t("settings.useDefaultAvatar")}
              </Button>
            </div>
            <div aria-live="polite">
              {avatarError ? (
                <p className="field-error" role="alert">
                  {avatarError}
                </p>
              ) : (
                <p className="field-hint">{t("settings.avatarHint")}</p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="stack stack-4" aria-labelledby="settings-account">
        <h2 className="t-heading" id="settings-account">
          {t("settings.account")}
        </h2>
        <div className="grid gap-3 md:grid-cols-2 md:gap-6">
          <FormField label={t("settings.displayName")} hint={t("settings.displayNameHint")} error={nameError}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={displayName}
                maxLength={30}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={saving}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (nameError) validateName(e.target.value.trim());
                }}
                onBlur={() => validateName()}
              />
            )}
          </FormField>
          <FormField label={t("auth.email")} hint={t("settings.emailReadonly")}>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="email" value={me.email} readOnly disabled />}
          </FormField>
        </div>
        <div className="row wrap">
          <Button type="submit" variant="primary" glow="sm" loading={saving} disabled={!dirty || removing}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
          <Button type="button" variant="ghost" onClick={reset} disabled={!dirty || saving}>
            {t("common.cancel")}
          </Button>
        </div>
      </Panel>
    </form>
  );
}

function formData(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return fd;
}
