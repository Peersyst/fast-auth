const styles = `
    .near-auth {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        max-width: 360px;
        padding: 24px;
    }

    .near-auth h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
    }

    .near-auth p {
        margin: 0 0 8px;
        font-size: 14px;
    }

    .near-auth-accounts {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        max-height: 260px;
        overflow-y: auto;
    }

    .near-auth-account {
        padding: 12px 16px;
        border: 1px solid rgb(64, 64, 64);
        border-radius: 12px;
        background-color: rgb(25, 25, 25);
        font-size: 14px;
        font-weight: 500;
        text-align: left;
        overflow-wrap: anywhere;
        cursor: pointer;
    }

    .near-auth-account:hover {
        border-color: rgb(0, 236, 151);
    }
`;

export const pickAccount = (accountIds: string[]): Promise<string> => {
    const root = document.getElementById("root")!;
    root.style.display = "flex";
    root.innerHTML = `
        <style>${styles}</style>
        <div class="near-auth">
            <h1>Choose an account</h1>
            <p>Your NEAR Auth key controls more than one account.</p>
            <div class="near-auth-accounts"></div>
        </div>
    `;
    window.selector.ui.showIframe();

    return new Promise<string>((resolve) => {
        const list = root.querySelector<HTMLDivElement>(".near-auth-accounts")!;

        accountIds.forEach((id) => {
            const button = document.createElement("button");
            button.className = "near-auth-account";
            button.textContent = id;
            button.addEventListener("click", () => {
                root.innerHTML = "";
                window.selector.ui.hideIframe();
                resolve(id);
            });
            list.appendChild(button);
        });
    });
};
