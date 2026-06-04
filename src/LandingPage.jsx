import React from "react";

function LandingPage() {
    function handleTwitterLogin() {
        window.location.href = "/auth/x/login";
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