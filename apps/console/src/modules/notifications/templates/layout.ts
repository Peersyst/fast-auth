export type RenderedEmail = { subject: string; html: string; text: string };

type Block =
    | { type: "paragraph"; text: string }
    | { type: "quote"; text: string }
    | { type: "code"; text: string }
    | { type: "link"; label: string; href: string };

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "Menlo,Consolas,'Liberation Mono',monospace";

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

function blockHtml(block: Block): string {
    switch (block.type) {
        case "paragraph":
            return `<p style="margin:0 0 16px 0;">${escapeHtml(block.text)}</p>`;
        case "quote":
            return `<blockquote style="margin:0 0 16px 0;padding:8px 16px;border-left:4px solid #d4d4d8;color:#3f3f46;">${escapeHtml(block.text).replace(/\n/g, "<br>")}</blockquote>`;
        case "code":
            return `<pre style="margin:0 0 16px 0;padding:12px 16px;background-color:#f4f4f5;border-radius:6px;font-family:${MONO};font-size:13px;line-height:1.5;color:#18181b;white-space:pre-wrap;word-break:break-all;">${escapeHtml(block.text)}</pre>`;
        case "link":
            return `<p style="margin:24px 0 16px 0;"><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:10px 18px;background-color:#18181b;color:#ffffff;border-radius:6px;font-weight:600;text-decoration:none;">${escapeHtml(block.label)}</a></p>`;
    }
}

function blockText(block: Block): string {
    switch (block.type) {
        case "paragraph":
            return block.text;
        case "quote":
            return block.text
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");
        case "code":
            return block.text
                .split("\n")
                .map((line) => (line ? `    ${line}` : line))
                .join("\n");
        case "link":
            return `${block.label}: ${block.href}`;
    }
}

export function renderLayout(subject: string, heading: string, blocks: Block[]): RenderedEmail {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;">
<tr><td style="padding:24px 32px 0 32px;font-family:${FONT};font-size:18px;font-weight:700;color:#18181b;">NEAR Auth</td></tr>
<tr><td style="padding:16px 32px 16px 32px;font-family:${FONT};font-size:15px;line-height:1.6;color:#18181b;">
<h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:700;color:#18181b;">${escapeHtml(heading)}</h1>
${blocks.map(blockHtml).join("\n")}
</td></tr>
</table>
<p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;color:#52525b;">Sent by the NEAR Auth Console.</p>
</td></tr>
</table>
</body>
</html>
`;
    const text = ["NEAR Auth", heading, ...blocks.map(blockText), "Sent by the NEAR Auth Console."].join("\n\n") + "\n";
    return { subject, html, text };
}
