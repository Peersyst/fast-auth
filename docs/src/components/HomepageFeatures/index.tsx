import type { ReactNode } from "react";
import styles from "./styles.module.css";
import { CardWithHeader } from "../CardWithHeader";
import { homeCardsData as cardData } from "./data";

export default function HomepageFeatures(): ReactNode {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className={styles.cardGrid}>
                    {cardData.map((card) => (
                        <CardWithHeader
                            key={card.title}
                            headerImageSrc={card.headerImageSrc}
                            headerImageAlt={card.headerImageAlt}
                            title={card.title}
                            description={card.description}
                            links={card.links}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
