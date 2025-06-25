import type { ReactNode } from "react";
import styles from "./styles.module.css";
import clsx from "clsx";

interface CardWithHeaderProps {
    headerImageSrc: string;
    headerImageAlt: string;
    title: string;
    description?: string;
    links: { label: string; href: string }[];
    className?: string;
}

export function CardWithHeader({ headerImageSrc, headerImageAlt, title, description, links, className }: CardWithHeaderProps): ReactNode {
    return (
        <div className={clsx("card", styles.customCard, className)}>
            <div className="card__image">
                <img src={headerImageSrc} alt={headerImageAlt} className={styles.cardHeaderImage} />
            </div>

            <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{title}</h3>
                {description && <p className={styles.cardDescription}>{description}</p>}
            </div>

            <ul className={styles.linkList}>
                {links.map((link) => (
                    <li key={link.href}>
                        <a href={link.href} className={styles.cardLink}>
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
