import React from "react";

interface AccordionProps {
    title: string;
    expanded: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, expanded, onClick, children }) => {
    return (
        <div style={{ border: "1px solid #333", borderRadius: 8, marginBottom: 16, background: "#23272f" }}>
            <button
                onClick={onClick}
                style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "1rem",
                    background: "#181a20",
                    border: "none",
                    borderRadius: "8px 8px 0 0",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                    color: "#f1f1f1",
                }}
            >
                {title}
            </button>
            {expanded && <div style={{ padding: "1rem", color: "#e0e0e0" }}>{children}</div>}
        </div>
    );
};

export default Accordion;
