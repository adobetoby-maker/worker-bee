import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import HowItWorks from "@/components/HowItWorks";
import ApplicationForm from "@/components/ApplicationForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="bg-[#080d1a] min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <Pricing />
      <HowItWorks />
      <ApplicationForm />
      <Footer />
    </main>
  );
}
