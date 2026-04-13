

import React, { useState, useEffect } from "react";
import "./styles.css";
import ProfileHeader from "./ProfileHeader";


function App() {
 const [input, setInput] = useState("");
 const isOwner = false;
 const nickname = "날";
 const [secret, setSecret] = useState(false);
 const [selectedFile, setSelectedFile] = useState(null);
 const [bgUrl, setBgUrl] = useState(localStorage.getItem("bgUrl")||"");
 const [viewMode, setViewMode] = useState("guest");
 const [replyTargetId, setReplyTargetId] = useState(null);
 const [showPreview, setShowPreview] = useState(false);
 const [profileImage, setProfileImage] = useState(
    localStorage.getItem("profileImage") || "");
 const [mobileTab, setMobileTab] = useState("chat");

 const [questionCards, setQuestionCards] = useState( () => {
  const saved = localStorage.getItem("questionCards");
  return saved ? JSON.parse(saved) : [];
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


async function handleSend() {
 const trimmedInput = input.trim();
 if (!trimmedInput && !selectedFile) return;



 if (viewMode === "owner" && replyTargetId !== null) {
  setQuestionCards(
    questionCards.map((card) =>
      card.id === replyTargetId
      ? {...card,
          answer: trimmedInput,
          answered: true,
          unread: false,
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
console.log("selectedFile:", selectedFile);
console.log("newQuestion fileUrl:", newQuestion.fileUrl);
}

function removeQuestion(id) {
 setQuestionCards(
   questionCards.filter((card) => card.id !== id)
 );
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

useEffect(() => {
  const loadArchiveHashtags = async () => {
    try {
      const connectedXId = localStorage.getItem("connectedXId") || "";
      const connectedXUserId = localStorage.getItem("connectedXUserId") || "";
      console.log("connectedXUserId:", localStorage.getItem("connectedXUserId"));
      console.log("connectedXId:", localStorage.getItem("connectedXId"));
      console.log("connectedXUserId before fetch:", connectedXUserId);
      console.log("connectedXId before fetch:", connectedXId);
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
  localStorage.setItem("questionCards", JSON.stringify(questionCards));
}, [questionCards]);

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
      setBgUrl={setBgUrl} />
    </aside>



<main className="chat-panel">
{mobileTab === "chat" &&(

    <section className="card-list">
      {questionCards.length === 0 ? (
        <p>질문이 없음</p>
      ) : (
        questionCards.map((card) => (

          <article
            key={card.id}
            className={`qa-card ${card.isPrivate ? "private" : ""}
            ${card.answered ? "answered" : ""}`}          >
            <div className="qa-card-content">
  
              <div className="question-line">
                <div className="question-box-wrap">
                  <div className="question-bubble">

                    {card.isPrivate ? (
                      viewMode === "owner" ? (
                      <>
                        <p className="private-tag">🔐비공개 질문</p>
                        <p className="question-text">{card.text}</p>
                        <p className="meta">{card.createdAt}</p>
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
                  <div className="question-top-actions">
                   {viewMode === "owner" && (
                  <button
                    className="reply-btn"
                    onClick={() => {
                     setReplyTargetId(card.id);
                     setInput(card.answer || "");
                    }}>
                    {card.answered ? "답변수정":"답변하기"}
                    </button>
                )}
              </div>


                 <div className="question-bottom-actions">
                  {card.answered && (
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


                    {viewMode === "owner" && (
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
            </div>  
              
          
              {card.answered && (
                <div className="answer-line">
    

                  {viewMode === "owner" && (
                   <button
                      className="answer-delete-btn"
                      onClick={() => removeQuestion(card.id)}
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
                      <p className="quoted-question">
                        {card.isPrivate ? "🔐 비공개된 질문입니다" : card.text}
                        {getQuestionPreview(card)}
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
                style={{display: "none"}}
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
       
            </div>
          </article>
        ))
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
                 

        <button onClick={handleSend} className="send-btn" type="button">
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
