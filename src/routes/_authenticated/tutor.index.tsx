import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tutor/")({
  component: TutorIndex,
});

function TutorIndex() {
  return (
    <div className="hidden md:flex h-[60vh] items-center justify-center text-center">
      <div>
        <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3">
          <MessageCircle className="size-7" />
        </div>
        <h3 className="font-semibold">Ask GenieMey anything</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a chat on the left or start a new one.
        </p>
      </div>
    </div>
  );
}
