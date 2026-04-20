

import React, { useState, useEffect } from "react";
import ProfileHeader from "./ProfileHeader";


function App() {
  const [input, setInput] = useState("");
  const [nickname, setNickname] = useState("날");
  const [profileBio, setProfileBio] = useState("");
  const [secret, setSecret] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [bgUrl, setBgUrl] = useState(localStorage.getItem("bgUrl") || "");
  const pathParts = window.location.pathname.split("/");
  const routeUsername =
    pathParts[1] === "u" ? decodeURIComponent(pathParts[2] || "") : "";
  const isLocalDev = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [profileImage, setProfileImage] = useState(
   localStorage.getItem("profileImage") || "");
  const [mobileTab, setMobileTab] = useState("chat");
  const [devViewMode, setDevViewMode] = useState("guest");
  const connectedXId = localStorage.getItem("connectedXId") || "";
  const isOwner = !isLocalDev && !!connectedXId && connectedXId === routeUsername;
  const viewMode = isLocalDev ? devViewMode : (isOwner ? "owner" : "guest");
  const [currentAuthUserId, setCurrentAuthUserId] = useState("");
  const [questionCards, setQuestionCards] = useState(() => {
  try {
   const savedQuestions =
    localStorage.getItem("questionCards") ||
    localStorage.getItem("questionCard");
   return savedQuestions ? JSON.parse(savedQuestions) : [];
  } catch (error) {
   console.error("questionCards parse error:", error);
   return [];
  }
 });


 const replyTargetCard = questionCards.find((card) => 
            card.id === replyTargetId);

 const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const handleLike = (id) => {
  setQuestionCards((prev) =>
    prev.map((card) =>
      card.id === id
        ? {
            ...card,
            liked: !card.liked,
            likeCount: card.liked
              ? Math.max((card.likeCount || 1) - 1, 0)
              : (card.likeCount || 0) + 1,
          }
        : card
    )
  );
};

 const totalLikeCount = questionCards.reduce(
    (sum, card) => sum + (card.likeCount || 0), 0);

 const [isSending, setIsSending] = useState(false);

async function handleSend() {
 if (isSending) return;

 const trimmedInput = (input || "").trim();
 if (!trimmedInput && !selectedFile) return;

 setIsSending(true);

 try {
  console.log("handleSend start", {
   input,
   trimmedInput,
   selectedFile,
   routeUsername,
   viewMode,
   secret,
  });



 if (viewMode === "owner" && replyTargetId !== null) {
  let answerFileUrl = "";
  let answerFileName = "";

  if (selectedFile) {
    answerFileUrl = await fileToDataUrl(selectedFile);
    answerFileName = selectedFile.name;
  }

  if (routeUsername) {
    try {
      const res = await fetch(`/api/questions/${replyTargetId}/answer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer: trimmedInput,
          answerFileUrl,
          answerFileName,       
        }),
      });

      const result = await res.json();
      console.log("PATCH status:", res.status);
      console.log("PATCH result:", result);

      if (!res.ok) {
        alert("답변 저장을 실패했습니다");
        return;
      }

      await loadQuestionsByUsername(routeUsername);

      setInput("");
      setReplyTargetId(null);
      setSelectedFile(null);
      setSecret(false);
      setShowPreview(false);
      return;
    } catch (error) {
    console.error("answer save error:", error);
    alert("답변 저장 중 오류가 발생했습니다");
    return;
    }
  }

  setQuestionCards(
    questionCards.map((card) =>
      card.id === replyTargetId
      ? {
          ...card,
          answer: trimmedInput,
          answerFileUrl,
          answerFileName,
          answered: true,
          unread: false,
          answeredAtISO: new Date().toISOString(),
        }
          : card
      )
    );

 

 setInput("");
 setReplyTargetId(null);
 setSelectedFile(null);
 setSecret(false);
 setShowPreview(false);
 return;
}

 let fileUrl ="";
 let fileName = "";
 
 if (selectedFile) {
  fileUrl = await fileToDataUrl(selectedFile);
  fileName = selectedFile.name;
 }

  console.log("POST body:", {
   text: trimmedInput,
   isPrivate: secret,
   fileUrl,
   fileName,
  });

  if (routeUsername) {
   try {
    const res = await fetch(`/api/users/${routeUsername}/questions`, {
      method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmedInput,
          isPrivate: secret,
          fileUrl,
          fileName,
          askerAuthId: currentAuthUserId,
        }),
    });

  const result = await res.json();

  if (!res.ok) {
    console.error("question insert failed:", result);
    alert("질문 저장에 실패했어요");
    return;
  }

  await loadQuestionsByUsername(routeUsername);

  setInput("");
  setSecret(false);
  setSelectedFile(null);
  setShowPreview(false);
  return;
  } catch (error) {
    console.error("question send error:", error);
    alert("질문 전송 중 오류가 발생했어요.");
    return;
  }
 }

 const newQuestion = {
  id: Date.now(),
  text: trimmedInput,
  isPrivate: secret,
  answer: "",
  answered: false,
  createdAt: new Date().toLocaleString("ko-KR"),
  createdAtISO: new Date().toISOString(),
  liked: false,
  likeCount: 0,
  unread: false,
  fileName,
  fileUrl,
 };

  setQuestionCards((prev) => [...prev, newQuestion]);
  setInput("");
  setSecret(false);
  setSelectedFile(null);
  setShowPreview(false);
  } finally {
 setIsSending(false);
  }
}

  async function removeQuestion(questionId) {
    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
      });

      const result = await res.json();
      console.log("delete question result:", result);

      if (!res.ok) {
        alert("질문 삭제 실패");
        return;
      }

      if (routeUsername) {
        await loadQuestionsByUsername(routeUsername);
      } else {
        setQuestionCards((prev) => prevfilter((card) => card.id !== questionId));
      }
    } catch (error) {
      console.error("removeQuestion error:", error);
      alert("질문 삭제 중 오류 발생");
    }
  }
 
  async function removeAnswer(questionId) {
    try {
      const res = await fetch(`/api/questions/${questionId}/answer/delete`, {
        method: "PATCH",
      });

      const result = await res.json();
      console.log("delete answer result:", result);

      if (!res.ok) {
        alert("삭제 실패");
        return;
      }

      if (routeUsername) {
        await loadQuestionsByUsername(routeUsername);
      } else {
        setQuestionCards((prev) =>
          prev.map((card) =>
            card.id === questionId
              ? {
                ...card,
                answer: "",
                answerFileUrl: "",
                answerFileName: "",
                answered: false,
                answeredAtISO: null,
              }
              : card
          )
        );
      }
    } catch (eeror) {
      console.erroer("removeAnswer error:", error);
      alert("삭제 중 오류 발생");
    }
  }

function getQuestionPreview(question) {
 const text = question?.text?.trim() || "";
 const hasImage = !!question?.fileUrl || !!question?.fileName;

 if (text) return text;
 if (hasImage) return "(사진)";
 if (!text && hasImage) return "📸사진";
 return "(내용없음)";
}

 function ArchiveGallery({posts, source}) {

  return (
    <section className="archive-box">
     <div className="archive-title-row">
      <h3 className="archive-title">Archive</h3>
      {source ===  "mock" && (
        <p className="archive-source-badge">sample</p>
      )}
    </div>

     <div className="archive-grid">
      {posts.map((group) => (
        <div key={group.hashtag} className="archive-card">
         <div className="archive-head">
          <p className="archive-hashtag">#{group.hashtag}</p>
          <span className="archive-count">게시글 {group.count}개</span>
         </div>

        <div className={`archive-images image-count-${Math.min(group.images.length, 4)}`}
          >
          {group.images.slice(0, 4).map((image,imageIndex) => (
            <div className="archive-image-wrap"
            key={`${group.hashtag}-${imageIndex}`}>
              <img src={image} alt={`archive-${group.hashtag}-${imageIndex}`} />
            </div>
          ))}
        </div>
      </div>
      ))}
      </div>
    </section>
  );
 }

const [archivePosts, setArchivePosts] = useState([]);
const [archiveSource, setArchiveSource] = useState("");

function getRecentAnswerText(questionCards) {
 const answeredCards = Array.isArray(questionCards)
  ? questionCards.filter((card) => card.answered)
  : [];

 if (answeredCards.length === 0) return "답변 없음";

 const latestAnswered = answeredCards
  .map((card) => card.answeredAtISO || card.createdAtISO)
  .filter(Boolean)
  .sort((a,b) => new Date(b) - new Date(a))[0];

 if (!latestAnswered) return "답변 없음";

 const diffMs = Date.now() - new Date(latestAnswered).getTime();
 const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

 if (diffDays <= 0) return "최근 답변 오늘";
 if (diffDays === 1) return "최근 답변 1일 전";
 return `최근 답변 ${diffDays}일 전`;
}

 const recentAnswerText = getRecentAnswerText(questionCards);
 const totalCards = questionCards.length;
 const answeredCount = questionCards.filter((card) => card.answered).length;
 const privateQuestionCount = questionCards.filter((card) => card.isPrivate).length;
 const unansweredCount = questionCards.filter((card) => !card.answered).length;
 const [highlightId, setHighlightId] = useState(
  localStorage.getItem("highlight") || ""
 );
  const highlightedCard = questionCards.find((card) => card.id === highlightId) || null;
async function loadQuestionsByUsername(username) {
  const res = await fetch(`/api/users/${username}/questions`);
  if (!res.ok) {
    throw new Error("questions load filed");
  }
  const data = await res.json();
  const sortedQuestions = Array.isArray(data)
   ? [...data].sort(
      (a, b) => new Date(a.createdAtISO || 0) - new Date(b.createdAtISO || 0)
     )
   : [];

  setQuestionCards(sortedQuestions);
}

 function formatDisplayDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ko-KR", {
   year: "numeric",
   month: "numeric",
   day: "numeric",
   hour: "numeric",
   minute: "2-digit",
   second: "2-digit",
  });
 }
  
  function satdParseJSON(key, fallbackValue) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallbackValue;
      return JSON.parse(raw);
    } catch (error) {
      console.error(`${key} parse error:`, error);
      return fallbackValue;
    }
  }

  useEffect(() => {
    async function ensureAnonymousAuth() {
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError) {
        console.error("getUser error:", getUserError);
      }

      if (user) {
        setCurrentAuthUserId(user.id);
        return;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error("anonymous sign-in error:", error);
        return;
      }

      setCurrentAuthUseerId(data.user?.id || "");
    }

    ensureAnonymousAuth();
  }, []);

  useEffect(() => {
    async function loadAuthUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentAuthUserId(user?.id || "");
    }

    loadAuthUser();
  }, []);


useEffect(() => {
 localStorage.setItem("questionCards", JSON.stringify(questionCards));
}, [questionCards]);

useEffect(() => {
  const loadArchiveHashtags = async () => {
    try {
      const connectedXUserId = localStorage.getItem("connectedXUserId") || "";

      const res = await fetch(
        `/archive/hashtags?ownerId=${encodeURIComponent(connectedXUserId)}&username=${encodeURIComponent(connectedXId)}`
      );

      const data = await res.json();
      setArchivePosts(data.hashtags || []);
      setArchiveSource(data.source || "");
      } catch (error) {
        console.error("아카이브 불러오기 실패", error);
      }
    };

  loadArchiveHashtags();
    },[]);


useEffect(() => {
 if (!routeUsername) return;

  fetch(`/api/users/${routeUsername}`)
    .then((res) => res.json())
    .then((data) => {
     const nextHighlightId =
      data.highlightId || localStorage.getItem("highlightId") || "";

   setHighlightId(nextHighlightId);
   setNickname(data.displayName || data.username || "이름없음");
   setProfileBio(data.bio || "");
   setProfileImage(data.avatarUrl || "");
   setBgUrl(data.bgUrl || "");

  localStorage.setItem("editNickname", data.displayName || "");
  localStorage.setItem("bio", data.bio || "");
  localStorage.setItem("profileImage", data.avatarUrl || "");
  localStorage.setItem("bgUrl", data.bgUrl || "");
  })
  .catch((err) => console.error("user fetch error:", err));
}, [isLocalDev, routeUsername]);


  
useEffect(() => {
 if (!routeUsername) return;

 loadQuestionsByUsername(routeUsername).catch((err) =>
  console.error("questions fetch error:", err)
 );
},[routeUsername]);



return (
  <>
  <div className="app"
    style={bgUrl ? { backgroundImage: `url(${bgUrl})`}:{}}> 

  <header className="top-bar">
    <svg
      className="top-bar-wave left"
      viewBox="0 0 120 24"
      preserveAspectRatio="none"
    >
      <path
        d="M0,12 C20,0 40,24 60,12 C80,0 100,24 120,12"
        fill="none"
        stroke="rgba(130,80,180,0.45)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>

    <h1>Ask me</h1>

<svg className="top-bar-wave right" viewBox="0 0 120 24" preserveAspectRatio="none">
    <path d="M0,12 C20,0 40,24 60,12 C80,0 100,24 120,12" 
          fill="none" stroke="rgba(130,80,180,0.45)" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>

        {isLocalDev && (
          <div className="dev-mode-toggle">
            <button
              type="button"
              className={devViewMode === "guest" ? "active" : ""}
              onClick={() => setDevViewMode("guest")}>
              guest
            </button>
            <button
              type="button"
              className={devViewMode === "owner" ? "active" : ""}
              onClick={() => setDevViewMode("owner")}>
              owner
            </button>
          </div>
        )}

 <div className="desktop-nav">
    <button className={`nav-btn ${mobileTab === "profile" ? "active" :""}`}
    onClick={() => setMobileTab("profile")}>
      Profile
    </button>

    <button className={`nav-btn ${mobileTab === "chat" ? "active" : ""}`}
      onClick={() => setMobileTab("chat")}>
      Ask
    </button>

    <button className={`nav-btn ${mobileTab === "archive" ? "active" : ""}`}
     onClick={() => setMobileTab("archive")}>
      Archive
    </button>
  </div>


 <div className="mobile-tabs">
  <button className={`nav-btn ${mobileTab === "profile" ? "active" : ""}`}
   onClick={() => setMobileTab("profile")}>
    Profile
  </button>

    <button className={`nav-btn ${mobileTab === "chat" ? "active":""}`}
      onClick={() => setMobileTab("chat")}>
    Ask
    </button>

  <button className={`nav-btn ${mobileTab === "archive" ? "active":""}`}
    onClick={() => setMobileTab("archive")}>
  Archive
  </button>
  </div>
  </header>

   <div className="app-shell">
    <aside className="profile-panel">
      <ProfileHeader
      viewMode={viewMode}
      questionCards={questionCards}
      profileImage={profileImage}
      setProfileImage={setProfileImage}
      totalLikeCount={totalLikeCount}
      bgUrl={bgUrl}
      setBgUrl={setBgUrl}
      nickname={nickname}
      profileBio={profileBio}
      recentAnswerText={recentAnswerText}
      totalCards={totalCards}
      answeredCount={answeredCount}
      privateQuestionCount={privateQuestionCount}
      unansweredCount={unansweredCount}
       />
    </aside>



<main className={`chat-panel ${viewMode}-view`}>
{mobileTab === "chat" &&(

    <section className={`card-list ${viewMode}-view`}>
              {questionCards.length === 0 ? (
                <p>질문이 없음</p>
              ) : (

                questionCards.map((card) => {
                  const hasAnswer = card.answered || !!card.answer || !!card.answerFileUrl
                  const canDeleteQuestion = viewMode === "owner" || card.askerAuthId === currentAuthUserId;

                  return (
                    <article
                      key={card.id}
                      className={`qa-card ${card.isPrivate ? "private" : ""}
            ${card.answered ? "answered" : ""}`}>
                      <div className="qa-card-content">
                  
                        
                          <div className="question-line">
                            <div className="question-box-wrap">
                              <div className="question-bubble">

                                {card.isPrivate ? (
                                  viewMode === "owner" ? (
                                    <>
                                      <p className="private-tag">🔐비공개 질문</p>
                                      <p className="question-text">{card.text}</p>
                                      <p className="meta">{formatDisplayDate(card.createdAtISO || card.createdAt)}</p>
                                    </>
                                  ) : (
                                    <span className="private-tag">🔐비공개된 질문입니다</span>
                                  )
                                ) : (
                                  <>
                                    <p className="question-text"> {card.text}</p>
                                    <p className="meta">{card.createdAt}</p>
                                  </>
                                )}

                                {card.fileUrl && (
                                  <div className="question-file-preview">
                                    <img src={card.fileUrl}
                                      alt={card.fileName || "첨부이미지"} />
                                  </div>
                                )}



                            </div>
                            







                            
                            </div>

              
                            <div className="question-actions">

                                {viewMode === "owner" && (
                                  <button
                                    className="reply-btn"
                                    onClick={() => {
                                      setReplyTargetId(card.id);
                                      setInput(card.answer || "");
                                    }}>
                                    {hasAnswer ? "답변수정" : "답변하기"}
                                  </button>
                                )}

                            </div>
      
                                {hasAnswer && (
                                  <div className="question-side check-side">
                                    <span className="answered-mark">
                                      <img
                                        className="check-img"
                                        src="/images/체크.png"
                                        alt="읽음"
                                      />
                                    </span>
                                  </div>
                                )}

           
                                {canDeleteQuestion && (
                                  <div className="question-side delete-side">
                                    <button
                                      className="question-delete-btn"
                                      onClick={() => removeQuestion(card.id)}>
                                      ×
                                    </button>
                                  </div>
                                )}
                 
  
                          </div>
                        
                      </div>
                        
          
                      {hasAnswer && (
                        <div className="answer-line">
    

                          {viewMode === "owner" && (
                            <button
                              className="answer-delete-btn"
                              onClick={() => removeAnswer(card.id)}
                            >
                              ×
                            </button>
                          )}

                          {viewMode === "guest" && (
                            <div className="answer-side like-side">
                              <button
                                className="like-btn"
                                onClick={() => handleLike(card.id)}
                              >
                                {card.liked ? "❤️" : "🩶"}
                              </button>
                            </div>
                          )}




                          <div className="answer-box-wrap">
                            <div className="answer-box">
                              <p className="answer-text">{card.answer}</p>
                              {card.answerFileUrl && (
                                <div className="answer-file-preview">
                                  <img
                                    src={card.answerFileUrl}
                                    alt={card.answerFileName || "첨부 이미지"}
                                  />
                                </div>
                              )}

                              <p className="quoted-question">
                                {card.isPrivate
                                  ? "🔐 비공개된 질문입니다"
                                  : getQuestionPreview(card)}
                              </p>
                            </div>
                          </div>

                          <div className="answer-side avatar-side">
                            <div className="card-avatar">
                              <img src={profileImage || "/images/default-avatar.png"}
                                alt="Profile"
                                className="profile-avatar" />
                              {viewMode === "owner" && (
                                <input
                                  id="profileImageInput"
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    setProfileImage(URL.createObjectURL(file));
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
 
        
      {showPreview && selectedFile && (
      <div className="preview-modal" onClick={() => setShowPreview(false)}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={URL.createObjectURL(selectedFile)} alt="선택한 이미지" />
        <div className="preview-modal-actions">
          <button type="button" onClick={() => setShowPreview(false)}>
            확인
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setShowPreview(false);
            }}>
            취소
          </button>

              </div>
            </div>
          </div>          
            )}

    <div className="ask-area-wrap">
  
        {selectedFile && !showPreview && (
          <div className="selected-file-card">
          <div className="selected-file-preview">
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="보낼 이미지"/>
          </div>
          <div className="selected-file-preview-meta">
            <span>{selectedFile.name}</span>

          <button
            type="button"
            onClick={() => { setSelectedFile(null);}}>
           삭제
          </button>
          </div>
          </div>
          )}

    <div className="ask-input-shell">
      {viewMode === "guest" && (
      <button
        className={`secret-toggle ${secret ? "on" : ""}`}
        onClick={() => setSecret(!secret)}
      >
        ◎ Secret
      </button>)}

                {viewMode === "owner" && replyTargetId !== null && (
                    <div className="replying-bar">
                    <span className="replying-bar-text">
                  {replyTargetCard && `"${replyTargetCard.text}"에 답하는 중`}
                    </span>

                    <button
                     className="reply-cancel-btn"
                     onClick={() => {
                      setReplyTargetId(null);
                      setInput("");
                    }}>
                     취소
                    </button>
                  </div>
                  )}






      <section className="input-row">
        <div className="message-field">
      
          <button
            className="clip-btn"
            onClick={() => document.getElementById("fileInput").click()}
            type="button"
          >
            📎
          </button>


          <input
            type="file"
            style={{ display: "none" }}
            id="fileInput"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              
              setSelectedFile(file);
              setShowPreview(true);
              
              e.target.value="";
            }}
          />

          <input
            className="message-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
            }}
            placeholder={
              viewMode === "owner"
                ? (replyTargetId !== null ? "답변을 입력하세요" : "질문에 답할 시간✨")
                : `${nickname}님에게 하고 싶은 말을 적어보세요!`}/>

          
                </div>
                 

        <button
          onClick={handleSend}
          className="send-btn"
          type="button"
          disabled={isSending}
        >
          <img src="/images/종이비행기.png" alt="전송" />
        </button>
      </section>







        </div>
        </div>

  </section>
)}
</main>

 <aside className="archive-panel">
  <ArchiveGallery posts={archivePosts} source={archiveSource} />
 </aside>
 </div>
</div>
</>
);
}

export default App;
