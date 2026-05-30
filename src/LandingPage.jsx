import React from "react";

function LandingPage() {
    function handleTwitterLogin() {
        window.location.href = "/auth/x/login";
    }

    return (
        <div className="landing">
            <div className="landing-bg" />
            <div className="landing-content">
                <div className="landing-logo">
                    <h1>Ask me</h1>
                    <p className="landing-tagline"></p>
                </div>
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