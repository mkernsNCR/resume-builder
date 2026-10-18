import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, queryClient, setExpectedUserId } from "@/lib/queryClient";

type User = { id: string; username: string };

function CredentialsForm({
  expectedUser,
  onAuthenticated,
}: {
  expectedUser?: User;
  onAuthenticated: (user: User) => Promise<void>;
}) {
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState(expectedUser?.username ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    // Stop all editor work before changing the shared session cookie.
    window.dispatchEvent(new Event("resume-session-suspend"));
    try {
      const response = await apiRequest(
        "POST",
        `/api/auth/${registering ? "register" : "login"}`,
        { username, password },
      );
      const user: User = await response.json();
      if (expectedUser && user.id !== expectedUser.id) {
        await apiRequest("POST", "/api/auth/logout");
        throw new Error(
          `Sign in as ${expectedUser.username} to recover these edits, or sign out to switch accounts.`,
        );
      }
      await onAuthenticated(user);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setPassword("");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
      <div className="space-y-2">
        <Label htmlFor="auth-username">Username</Label>
        <Input
          id="auth-username"
          autoComplete="username"
          required
          minLength={registering ? 3 : 1}
          maxLength={50}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-password">Password</Label>
        <Input
          id="auth-password"
          type="password"
          autoComplete={registering ? "new-password" : "current-password"}
          required
          minLength={registering ? 8 : 1}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {registering && (
          <p className="text-xs text-muted-foreground">
            Use at least 8 characters, up to 72 UTF-8 bytes.
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : registering ? "Create account" : "Sign in"}
      </Button>
      {!expectedUser && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={pending}
          onClick={() => {
            setRegistering(!registering);
            setError("");
          }}
        >
          {registering
            ? "Already have an account? Sign in"
            : "Create an account"}
        </Button>
      )}
    </form>
  );
}

export function AuthGate({
  children,
}: {
  children: (user: User, signOut: () => void) => ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expired, setExpired] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadSession = useCallback(
    () =>
      apiRequest("GET", "/api/auth/me")
        .then(async (response) => {
          const current: User | null = await response.json();
          setLoadError("");
          setExpectedUserId(current?.id ?? null);
          setUser(current);
        })
        .catch(() =>
          setLoadError("Unable to check your session. Please try again."),
        )
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void loadSession();
  }, [loadSession]);
  useEffect(() => {
    const suspend = () => setExpired(true);
    window.addEventListener("resume-auth-expired", suspend);
    return () => window.removeEventListener("resume-auth-expired", suspend);
  }, []);

  async function authenticated(current: User) {
    await queryClient.cancelQueries();
    queryClient.clear();
    setExpectedUserId(current.id);
    setUser(current);
    setExpired(false);
    window.dispatchEvent(new Event("resume-session-restored"));
  }

  async function signOut() {
    if (
      signingOut ||
      !window.confirm("Signing out discards any unsaved edits. Continue?")
    )
      return;
    window.dispatchEvent(new Event("resume-session-suspend"));
    setSigningOut(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
      window.dispatchEvent(new Event("resume-session-discard"));
      await queryClient.cancelQueries();
      queryClient.clear();
      setExpectedUserId(null);
      setUser(null);
      setExpired(false);
    } catch {
      setExpired(true);
    } finally {
      setSigningOut(false);
    }
  }

  if (loading)
    return (
      <main className="min-h-screen grid place-items-center">
        <p role="status">Checking your session…</p>
      </main>
    );
  if (loadError)
    return (
      <main className="min-h-screen grid place-items-center">
        <Card className="p-6 space-y-4">
          <p role="alert">{loadError}</p>
          <Button
            onClick={() => {
              setLoading(true);
              void loadSession();
            }}
          >
            Retry
          </Button>
        </Card>
      </main>
    );
  if (!user)
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Resume Builder</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to create and manage your private resumes.
            </p>
          </div>
          <CredentialsForm onAuthenticated={authenticated} />
        </Card>
      </main>
    );

  return (
    <>
      {children(user, () => {
        void signOut();
      })}
      <Dialog open={expired}>
        <DialogContent
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogTitle>Sign in again to continue</DialogTitle>
          <DialogDescription>
            Your session changed or expired. Your unsaved edits are kept here
            while you sign back in as {user.username}.
          </DialogDescription>
          <CredentialsForm
            expectedUser={user}
            onAuthenticated={authenticated}
          />
          <Button
            variant="outline"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            Sign out and discard edits
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
