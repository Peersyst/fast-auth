import type { ReactNode } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import { HeroSection } from "../components/HeroSection";
import HomepageFeatures from "../components/HomepageFeatures";

export default function Home(): ReactNode {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout title={`Hello from ${siteConfig.title}`} description="Description will go into a meta tag in <head />">
            <main>
                <HeroSection
                    title="FastAuth"
                    description="FastAuth is a NEAR Protocol-based authentication system that enables secure transaction signing through Multi-Party Computation (MPC) and JWT-based verification."
                    imageSrc="img/near-logo.webp"
                    imageAlt="FastAuth Logo"
                >
                    <HomepageFeatures />
                </HeroSection>
            </main>
        </Layout>
    );
}
