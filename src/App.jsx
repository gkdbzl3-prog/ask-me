import React, { useState, useEffect } from "react";
import ProfileHeader from "./ProfileHeader";
import { supabase } from "./supabaseClient";

function App() {
  const [input, setInput] = useState("");
  const [nickname, setNickname] = useState("날");
  const [profileBio, setProfileBio] = useState("");
  const [secret, setSecret] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
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
  const [questionCards, setQuestionCards] = useState([]);


 const replyTargetCard = questionCards.find((card) => 
            card.id === replyTargetId);

  async function uploadImageToStorage(file, folder = "question-files") {
    if (!file) return "";

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-media")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    
    if (uploadError) {
      console.error("qa storage upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from("profile-media").getPublicUrl(fileName);

    return data.publicUrl;
  }

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
 if (!trimmedInput && !selectedFiles) return;

  if (viewMode === "owner" && replyTargetId === null) {
    alert("먼저 질문을 선택해주세요");
    return;
  }
  
  
 setIsSending(true);


    console.log("handleSend start", {
      input,
      trimmedInput,
      selectedFiles,
      routeUsername,
      viewMode,
      secret,
    });



  if (viewMode === "owner" && replyTargetId !== null) {
    let uploadedAnswerFiles = [];

    if (selectedFiles.length > 0) {
      uploadedAnswerFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const fileUrl = await uploadImageToStorage(file, "answer-files");
          return {
            fileUrl,
            fileName: file.name,
          };
        })
      );
    }
   
      if (!routeUsername) {
        alert("유저 페이지에서만 질문을 보낼 수 있습니다.");
        return;
      }

      const res = await fetch(`/api/questions/${replyTargetId}/answer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer: trimmedInput,
          answerFiles: uploadedAnswerFiles,        
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
      setSelectedFiles([]);
      setSecret(false);
      setShowPreview(false);
      return;
    }
   
  

  let uploadedFiles = [];
 
 if (selectedFiles.length > 0) {
       uploadedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const fileUrl = await uploadImageToStorage(file, "question-files");
          return {
            fileUrl,
            fileName: file.name,
          };
        })
      );
    }


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
          files: uploadedFiles,
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
  setSelectedFiles([]);
  setShowPreview(false);
  return;
  } catch (error) {
    console.error("question send error:", error);
    alert("질문 전송 중 오류가 발생했어요.");
    return;
  }
 }



}

  async function removeQuestion(questionId) {
    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requesterAuthId: currentAuthUserId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert("질문 삭제 실패");
        return;
      }

      if (routeUsername) {
        await loadQuestionsByUsername(routeUsername)
      } else {
        setQuestionCards((prev) => prev.filter((card) => card.id !== questionId));
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
      }
    } catch (error) {
      console.error("removeAnswer error:", error);
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

async function loadQuestionsByUsername(username) {
  const res = await fetch(`/api/users/${username}/questions`);
  if (!res.ok) {
    throw new Error("questions load filed");
  }

  const data = await res.json();
  const normalized = Array.isArray(data)
    ? data
      .map((q) => ({
        ...q,
        askerAuthId: q.askerAuthId || q.asker_auth_id || "",
      }))
      .sort(
        (a, b) =>
          new Date(a.createdAtISO || 0) - new Date(b.createdAtISO || 0)
      )
    : [];
 
    setQuestionCards(normalized);
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

      setCurrentAuthUserId(data.user?.id || "");
    }

    ensureAnonymousAuth();
  }, []);


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
    if (!routeUsername) {
    setQuestionCards([]);
    return;
  }
    
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
            routeUsername={routeUsername}
            setNickname={setNickname}
            setProfileBio={setProfileBio}
       />
    </aside>



<main className={`chat-panel ${viewMode}-view`}>
{mobileTab === "chat" &&(

    <section className={`card-list ${viewMode}-view`}>
              {questionCards.length === 0 ? (
                <p>질문이 없음</p>
              ) : (

                questionCards.map((card) => {
                  const hasAnswer = card.answerFiles?.length > 0
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
                                      <p className="meta">{formatDisplayDate(card.createdAtISO || card.createdAt)}</p>
                                  </>
                                )}

                                {card.files?.length > 0 && (
                                <div className="question-file-grid">
                                  {card.files.map((file, index) => (
                                    <div className="question-file-item" key={index}>
                                    <img src={file.fileUrl}
                                        alt={file.fileName || `첨부이미지-${index + 1}`} />
                                      </div>
                                  ))}
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
                              {card.answerFiles?.length > 0 && (
                                <div className="answer-file-grid">
                                  {card.answerFiles.map((file, index) => (
                                    <div className="question-file-item" key={index}>
                                  <img
                                    src={file.fileUrl}
                                    alt={file.fileName || `첨부이미지-${index + 1}`}
                                  />
                                </div>
                                  ))}
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
                                  style={{ display: "none" }}
                                  accept="image/*"                                
                                  onChange={(e) => {
                                    const files = Array.from(e.toarget.files || []);                                  
                                    setProfileImage(files);
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
 
        
      {showPreview && selectedFiles.length > 0 && (
      <div className="preview-modal" onClick={() => setShowPreview(false)}>
                  <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
                    
                      <div className={selectedFiles.length > 1
                        ? "preview-grid is-multi"
                        : "preview-grid is-single"}>                      
                      {selectedFiles.map((file, index) => (
                        <div className="preview-grid-item" key={`${file.name}-${index}`}>
                          <img src={URL.createObjectURL(file)} alt={`선택한 이미지 ${index + 1}`} />
                          </div>
                      ))}
                        </div>
                    
        <div className="preview-modal-actions">
          <button type="button" onClick={() => setShowPreview(false)}>
            확인
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedFiles([]);
              setShowPreview(false);
            }}>
            취소
          </button>
                     
              </div>
            </div>
          </div>          
            )}

    <div className="ask-area-wrap">
  
                {selectedFiles.length > 0 && !showPreview && (
                  <div className="selected-file-card">
                    <div className={selectedFiles.length > 1
                      ? "selected-file-grid is-multi"
                      : "selected-file-grid is-single"}>
                      {selectedFiles.map((file, index) => (
                        <div className="selected-file-grid-item" key={`${file.name}-${index}`}>
                          <div className="selected-file-preview">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`보낼 이미지 ${index + 1}`} />
                          </div>              
                        </div>
                       
                      ))}
                    </div>
                    
                      <div className="selected-file-preview-meta">
                        <span>
                          {selectedFiles.length === 1
                            ? selectedFiles[0].name
                            : `${selectedFiles.length}개의 이미지 선택됨`}
                          </span>
                      
                            <button
                              type="button"
                              onClick={() => {
                          setSelectedFiles((prev) => [...prev, ...files]);              
                              }}
                            >
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
                        multiple
                        accept="image/*"
                        onChange={(e) => {              
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;                          
                            
                          setSelectedFiles((prev) => [...prev, ...files]);              
                          setShowPreview(true);                            
                          e.target.value = "";            
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
