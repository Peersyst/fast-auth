import type { ReactNode } from "react";
import styles from "./styles.module.css";
import clsx from "clsx";

interface HeroSectionProps {
    title: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
    className?: string;
    children?: ReactNode;
}

export function HeroSection({ title, description, imageSrc, imageAlt, className, children }: HeroSectionProps): ReactNode {
    return (
        <header className={clsx("hero hero--primary", styles.heroSection, className)}>
            <div className="container">
                <div className="row">
                    <div className="col col--12 text--center">
                        <div className={styles.heroHeaderRow}>
                            <img src={imageSrc} alt={imageAlt} className={styles.heroLogo} />
                            <h1 className={clsx("hero__title", styles.heroTitle)}>{title}</h1>
                        </div>
                        <p className={clsx("hero__subtitle", styles.heroDescription)}>{description}</p>
                        {children && <div className={styles.heroActions}>{children}</div>}
                    </div>
                </div>
            </div>
        </header>
    );
}
