/* eslint-disable @next/next/no-head-element */
import * as React from "react";
import { APP_NAME } from "@/config/brand";
import { formatEmailLoginCode } from "@/server/auth/email-code-utils";

interface EmailCodeTemplateProps {
  code: string;
  expiresInMinutes?: number;
}

const BRAND_NAME = APP_NAME;

export function EmailCodeTemplate({
  code,
  expiresInMinutes = 5,
}: EmailCodeTemplateProps) {
  const displayCode = formatEmailLoginCode(code);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sign in to {BRAND_NAME}</title>
      </head>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: "#f8fafc",
          margin: 0,
          padding: "40px 20px",
        }}
      >
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
          }}
        >
          <tr>
            <td
              style={{
                background: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
                padding: "32px 40px",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#ffffff",
                }}
              >
                {BRAND_NAME}
              </h1>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "40px" }}>
              <h2
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                Your sign-in code
              </h2>
              <p
                style={{
                  margin: "0 0 24px 0",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  color: "#64748b",
                }}
              >
                Enter this code on the sign-in page to continue. It expires in{" "}
                {expiresInMinutes} minutes.
              </p>
              <p
                style={{
                  margin: "0 0 24px 0",
                  padding: "18px 20px",
                  borderRadius: "10px",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontSize: "32px",
                  fontWeight: 700,
                  letterSpacing: "6px",
                  textAlign: "center",
                }}
              >
                {displayCode}
              </p>
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: "24px 40px",
                backgroundColor: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                If you did not request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

export function renderEmailCodeHtml(
  code: string,
  expiresInMinutes = 5,
): string {
  const displayCode = formatEmailLoginCode(code);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in to ${BRAND_NAME}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
    <table cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <tr>
        <td style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">${BRAND_NAME}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 40px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1e293b;">Your sign-in code</h2>
          <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #64748b;">Enter this code on the sign-in page to continue. It expires in ${expiresInMinutes} minutes.</p>
          <p style="margin: 0 0 24px 0; padding: 18px 20px; border-radius: 10px; background-color: #0f172a; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center;">${displayCode}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: center;">If you did not request this email, you can safely ignore it.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
