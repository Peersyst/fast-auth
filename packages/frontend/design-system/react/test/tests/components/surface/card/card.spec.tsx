import { render, screen } from "@testing-library/react";
import { Card, CardBody, CardHeader } from "../../../../../src/components/surface/card";

describe("Card", () => {
    it("should be a region named by its heading", () => {
        render(
            <Card aria-labelledby="activity-heading">
                <CardHeader variant="split">
                    <h2 id="activity-heading">Activity</h2>
                    <span>3 events</span>
                </CardHeader>
                <CardBody>No events yet.</CardBody>
            </Card>,
        );

        expect(screen.getByRole("region", { name: "Activity" })).toHaveTextContent("Activity3 eventsNo events yet.");
    });

    it("should render as an article when asked", () => {
        render(
            <Card as="article" aria-label="Acme Wallet">
                <h2>Acme Wallet</h2>
            </Card>,
        );

        expect(screen.getByRole("article", { name: "Acme Wallet" })).toBeInTheDocument();
    });

    it("should render its body as a paragraph when asked", () => {
        render(
            <Card>
                <CardBody as="p">No events yet.</CardBody>
            </Card>,
        );

        expect(screen.getByText("No events yet.").tagName).toBe("P");
    });

    it("should let a later class name win over the card's", () => {
        render(<Card className="border-warning-border">Change under review</Card>);

        expect(screen.getByText("Change under review")).toHaveClass("border-warning-border");
        expect(screen.getByText("Change under review")).not.toHaveClass("border-border");
    });
});
