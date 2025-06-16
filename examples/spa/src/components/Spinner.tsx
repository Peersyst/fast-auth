import React from "react";

const Spinner: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <span
        style={{
            display: "inline-block",
            width: size,
            height: size,
            border: "2px solid #e0e0e0",
            borderTop: "2px solid #646cff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            verticalAlign: "middle",
        }}
    />
);

export default Spinner;

// Add keyframes for spin animation
const style = document.createElement("style");
style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);
