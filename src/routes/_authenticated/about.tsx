import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Sparkles, Building2, Target, Heart, Phone, Users, Bot, BookOpen, ClipboardList, FileText, MessageCircleQuestion, TrendingUp, Library, CheckCircle2, Rocket, Lightbulb, Globe, ShieldCheck, RefreshCw } from "lucide-react";
import founderAsset from "@/assets/founder.png.asset.json";
import habibAsset from "@/assets/habib.jpg.asset.json";
import fluxcodeLogoAsset from "@/assets/fluxcode-logo.png.asset.json";
const fluxcodeLogo = fluxcodeLogoAsset.url;

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
            <span className="font-semibold text-foreground">FluxCode Tech</span>.
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
            Built by <span className="font-semibold text-foreground">FluxCode Tech</span>.
          </p>
        </Card>
      </section>

      {/* About FluxCode Tech */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Building2 className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">About FluxCode Tech</h2>
        </div>
        <Card className="p-6 rounded-2xl border border-border/80 space-y-4">
          <div className="flex justify-center">
            <img
              src={fluxcodeLogo}
              alt="FluxCode Tech logo"
              loading="lazy"
              width={512}
              height={512}
              className="w-40 h-40 object-contain"
            />
          </div>
          <div className="space-y-3 text-[0.95rem] leading-relaxed text-foreground/90">
            <p>
              FluxCode Tech is a technology and product development initiative focused on building practical AI-powered solutions for education, local businesses, and everyday problems.
            </p>
            <p>
              We design and develop modern digital products that combine AI, automation, and user-friendly technology to turn real-world ideas into working solutions. Our projects include GenieMey, an AI-powered learning platform for students, along with business-focused solutions such as CafeCode and HTrack.
            </p>
            <p>
              Our vision is to build useful, affordable, and scalable technology while starting from real problems faced by students, businesses, and local communities.
            </p>
            <p className="text-sm font-medium text-primary italic">
              Building ideas for the future.
            </p>
          </div>
        </Card>
      </section>

      {/* Contact & Team */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Users className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Contact &amp; Team</h2>
        </div>

        <Card className="p-5 rounded-2xl border border-border/80 space-y-3">
          <a
            href="mailto:stenmeytechnologies@gmail.com"
            className="flex items-center gap-3 rounded-xl p-2 -m-2 hover:bg-muted/60 transition"
          >
            <div className="size-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Mail className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium truncate">stenmeytechnologies@gmail.com</p>
            </div>
          </a>
          <a
            href="tel:+919622053027"
            className="flex items-center gap-3 rounded-xl p-2 -m-2 hover:bg-muted/60 transition"
          >
            <div className="size-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Phone className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium truncate">+91 96220 53027</p>
            </div>
          </a>
        </Card>

        <h3 className="text-base font-semibold tracking-tight pt-1">Meet the Team</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              name: "Imtiaz Ahmed",
              role: "Founder & Developer",
              img: founderAsset.url,
              pos: "center 20%",
              desc: "Imtiaz Ahmed is the founder and developer of GenieMey. He created the idea, planned the platform, and worked on its product design and development with the goal of making learning more accessible and technology-driven.",
            },
            {
              name: "Mohd Habib Rehman",
              role: "Co-Founder — Presentation & Project Operations",
              img: habibAsset.url,
              pos: "center 20%",
              desc: "Mohd Habib Rehman supports GenieMey in project presentation, communication, launch coordination, and execution. He contributes to presenting the platform and supporting its future growth and implementation.",
            },
          ].map((m) => (
            <Card
              key={m.name}
              className="p-5 rounded-2xl border border-border/80 flex flex-col items-center text-center gap-3 hover:shadow-md transition"
            >
              <div className="size-20 rounded-full overflow-hidden border-4 border-primary/30 shadow-sm bg-primary/5">
                <img
                  src={m.img}
                  alt={m.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: m.pos }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-xs font-medium text-primary">{m.role}</p>
              </div>
              <p className="text-[0.85rem] leading-relaxed text-foreground/80">{m.desc}</p>
            </Card>
          ))}
        </div>
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
      {/* What GenieMey AI Offers */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">What GenieMey AI Offers</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Bot, title: "AI-Powered Explanations", desc: "Understand complex topics through intelligent AI explanations." },
            { icon: BookOpen, title: "Smart Study Notes", desc: "Well-structured notes generated for faster learning." },
            { icon: ClipboardList, title: "Interactive Quizzes", desc: "Test knowledge instantly with AI-powered quizzes." },
            { icon: FileText, title: "Downloadable PDF Notes", desc: "Access printable study material anytime." },
            { icon: MessageCircleQuestion, title: "AI Doubt Assistant", desc: "Ask questions and receive instant academic support." },
            { icon: Target, title: "Personalized Learning", desc: "Learning experience tailored to each student." },
            { icon: TrendingUp, title: "Progress Tracking", desc: "Track performance and identify improvement areas." },
            { icon: Library, title: "Organized Subject Learning", desc: "Easy navigation through subjects and classes." },
          ].map((f) => (
            <Card key={f.title} className="p-4 rounded-2xl border border-border/80 flex items-start gap-3 hover:shadow-md transition">
              <div className="size-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <f.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Why Choose GenieMey AI */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <CheckCircle2 className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Why Choose GenieMey AI</h2>
        </div>
        <Card className="p-5 rounded-2xl border border-border/80">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "AI designed specifically for education.",
              "Easy-to-understand explanations.",
              "Saves valuable study time.",
              "Personalized learning support.",
              "Clean and distraction-free interface.",
              "Secure and privacy-focused.",
              "Continuously improving with AI.",
              "Built for students, teachers, and schools.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/90 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Product Roadmap */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Rocket className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Product Roadmap</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5 rounded-2xl border border-border/80 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Current Features</h3>
            <div className="space-y-2">
              {[
                "AI Chat Assistant",
                "AI Study Notes",
                "Smart Quiz System",
                "PDF Notes",
                "Subject & Class Selection",
                "Personalized Learning",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success shrink-0" />
                  <p className="text-sm text-foreground/90">{item}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 rounded-2xl border border-border/80 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Coming Soon</h3>
            <div className="space-y-2">
              {[
                "AI-generated Video Lectures",
                "Teacher Dashboard",
                "Parent Dashboard",
                "Smart Board Integration",
                "Homework & Assignment Tracking",
                "Voice AI Tutor",
                "Mobile Applications",
                "Learning Analytics",
                "Multi-language Support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Rocket className="size-4 text-primary shrink-0" />
                  <p className="text-sm text-foreground/90">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Core Values */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Heart className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Core Values</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Lightbulb, title: "Innovation", desc: "Building intelligent educational technology." },
            { icon: Users, title: "Student First", desc: "Every feature is designed around learners." },
            { icon: Globe, title: "Accessibility", desc: "Making quality education available to everyone." },
            { icon: ShieldCheck, title: "Trust & Privacy", desc: "Protecting user data with responsibility." },
            { icon: RefreshCw, title: "Continuous Improvement", desc: "Always learning, improving, and evolving." },
          ].map((v) => (
            <Card key={v.title} className="p-4 rounded-2xl border border-border/80 space-y-2 hover:shadow-md transition">
              <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center w-fit">
                <v.icon className="size-4" />
              </div>
              <p className="text-sm font-semibold">{v.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Version Information */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Version Information</h2>
        </div>
        <Card className="p-5 rounded-2xl border border-border/80 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="text-sm font-semibold">GenieMey AI</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="text-sm font-semibold">1.0 Beta</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-sm font-semibold">Under Continuous Development</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-sm font-semibold">August 2026</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Quote */}
      <section className="text-center py-6">
        <p className="text-sm italic text-muted-foreground max-w-xl mx-auto leading-relaxed">
          "Every great innovation starts with a single idea. GenieMey AI is committed to transforming education through Artificial Intelligence."
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/80 pt-8 pb-4 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold">Made with ❤️ in India</p>
          <p className="text-xs text-muted-foreground">Powered by FluxCode Tech</p>
          <p className="text-xs text-muted-foreground">Building AI Solutions for Education & Business</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">© 2026 FluxCode Tech. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
