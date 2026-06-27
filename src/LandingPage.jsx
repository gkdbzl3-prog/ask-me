import React from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

function LandingPage() {
    async function handleTwitterLogin() {
        const loginUrl = "https://ask-me.fly.dev/auth/x/login?native=1";
        if (Capacitor.isNativePlatform()) {
            try {
                await Browser.open({ url: loginUrl });
            } catch {
                window.location.href = loginUrl;
            }
        } else {
            window.location.href = "/auth/x/login";
        }
    }

    return (
        <div className="landing">
            <div className="landing-content">
                <img src="/images/landing-logo.png" alt="Ask me" className="landing-logo-img" />

                <div className="landing-actions">
                    <button
                        type="button"
                        className="landing-btn primary"
                        onClick={handleTwitterLogin}>
                        트위터 연동
                    </button>
                    <button
                        type="button"
                        className="landing-btn secondary"
                        onClick={handleTwitterLogin}>
                        나의 질문함 만들기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LandingPage;