import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="icon" title="Sign out" aria-label="Sign out">
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
