import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Sparkles, Building2, Quote, Target, Heart } from "lucide-react";
import founderAsset from "@/assets/founder.png.asset.json";
import stenmeyLogo from "@/assets/stenmey-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/about")({
  component: AboutPage,
});

function AboutPage() {

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>

      {/* About GenieMey AI */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">About GenieMey AI</h1>
        </div>
        <Card className="p-5 rounded-2xl border border-border/80 space-y-3 text-[0.95rem] leading-relaxed text-foreground/90">
          <p>
            GenieMey AI is an AI-powered learning platform designed to help students study smarter
            through interactive learning, tests, AI assistance, revision tools and personalized
            study experiences.
          </p>
          <p>
            Our mission is to make learning simple, engaging and accessible for every student.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with <span className="text-destructive">❤</span> by{" "}
            <span className="font-semibold text-foreground">StenMey Technologies</span>.
          </p>
        </Card>
      </section>

      {/* Our Mission */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Target className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Our Mission</h2>
        </div>
        <Card className="p-5 rounded-2xl border border-border/80 space-y-3 text-[0.95rem] leading-relaxed text-foreground/90">
          <p>
            GenieMey AI was created with one simple goal: to bring everything a student needs for
            learning into one platform.
          </p>
          <p>
            Instead of switching between multiple websites, search engines, AI chatbots and apps,
            students can access chapter explanations, notes, homework help, AI assistance, practice
            tests, revision tools and study resources in one place.
          </p>
          <p>
            Our mission is to save students' time, simplify learning and help them prepare with
            confidence.
          </p>
          <p className="text-sm text-muted-foreground">
            Built by <span className="font-semibold text-foreground">StenMey Technologies</span>.
          </p>
        </Card>
      </section>

      {/* About StenMey Technologies */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Building2 className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">About StenMey Technologies</h2>
        </div>
        <Card className="p-6 rounded-2xl border border-border/80 space-y-4">
          <div className="flex justify-center">
            <img
              src={stenmeyLogo.url}
              alt="StenMey Technologies logo"
              className="w-40 h-40 object-contain"
            />
          </div>
          <div className="space-y-3 text-[0.95rem] leading-relaxed text-foreground/90">
            <p>
              StenMey Technologies is a student-led technology initiative focused on creating
              useful digital products for learning, innovation and everyday problem solving.
            </p>
            <p>
              We aim to build simple, modern and impactful technology that helps people learn,
              create and grow.
            </p>
            <p className="text-sm font-medium text-primary italic">
              Building ideas for the future.
            </p>
          </div>
        </Card>
      </section>

      {/* Founder Note */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Quote className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Founder Note</h2>
        </div>
        <Card className="p-6 rounded-2xl border border-border/80 flex flex-col items-center text-center gap-4">
          <div className="size-28 rounded-full overflow-hidden border-4 border-primary/30 shadow-md bg-primary/5">
            <img
              src={founderAsset.url}
              alt="Imtiaz Ahmed — Founder"
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 20%" }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">Imtiaz Ahmed</p>
            <p className="text-xs font-medium text-primary">Founder</p>
          </div>
          <div className="space-y-3 text-[0.95rem] leading-relaxed text-foreground/90 text-left">
            <p>
              GenieMey AI started as an idea to improve the way students learn and access
              educational support. This project is being developed with a focus on making
              learning more accessible and practical for students.
            </p>
            <p className="font-medium">Thank you for being part of the journey.</p>
          </div>
        </Card>
      </section>

      <section className="text-center pt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Heart className="size-3 text-destructive" />
        <span className="uppercase tracking-wider">Version 1.0 Beta</span>
      </section>

      <section className="flex justify-center pb-4">
        <a href="mailto:feedback@geniemey.app?subject=GenieMey%20AI%20Feedback">
          <Button className="rounded-full px-6 h-11 gap-2">
            <Mail className="size-4" />
            Send Feedback
          </Button>
        </a>
      </section>
    </div>
  );
}
