
import React, { useState, useEffect } from "react";

export default function ProfileHeader({ 
    viewMode, 
    questionCards=[],
    profileImage,
    setProfileImage,
    totalLikeCount,
    bgUrl,
    setBgUrl,
    nickname,
    profileBio,
    recentAnswerText,
    totalCards,
    answeredCount,
    privateQuestionCount,
    unansweredCount,
    highlightId,
    }) {


const [editNickname, setEditNickname] = useState(
  localStorage.getItem("editNickname") || "");
const [bio, setBio] = useState(
  localStorage.getItem("bio") || "");
const [link1, setLink1] = useState(
  localStorage.getItem("link1") || "");
const [link2, setLink2] = useState(
  localStorage.getItem("link2") || "");
const [theme, setTheme] = useState("purple");
const [highlightQuery, setHighlightQuery] = useState("");

const filteredHighlightCards = questionCards.filter((card) => {
  const text = card?.text || "";
  const query = (highlightQuery || "").trim().toLowerCase();

  if (!query) return !!text;
  return text.toLowerCase().includes(query);
});


const parseKoreanDateString = (dateString) => {
  if(!dateString) return null;
  
  const match = dateString.match(
  /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})/);

  if(!match) return null;

  let [, year, month, day, ampm, hour, minute, second] = match;

  year = Number(year);
  month = Number(month);
  day = Number(day);
  hour = Number(hour);
  minute = Number(minute);
  second = Number(second);

  if (ampm === "오후" && hour !== 12) hour += 12;
  if (ampm === "오전" && hour === 12) hour = 0;

  return new Date(year, month -1, day, hour, minute, second);
};



  const highlightCard = questionCards.find((card) => card.id === highlightId);
  const [profilePageIndex, setProfilePageIndex] = useState(0);

  const [twitterId, setTwitterId] = useState(
    localStorage.getItem("twitterId") || ""
  );

  const [isXConnected, setIsXConnected]= useState(
    localStorage.getItem("isXConnected") === "true"
  );
  const [connectedXId, setConnectedXId] = useState(
    localStorage.getItem("connectedXId") || ""
  );


 const fileToDataUrl = (file) => 
   new Promise((resolve, reject) => {
   const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
   })

 const highlightLikeCount = highlightCard?.likeCount || 0;

 const handleConnectX = () => {
   window.location.href = "/auth/x/login";
  };



useEffect(() => {
  localStorage.setItem("editNickname", editNickname);
},[editNickname]);

useEffect(() => {
  localStorage.setItem("twitterId", twitterId);
}, [twitterId]);

useEffect(() => {
  localStorage.setItem("bio", bio);
}, [bio]);

useEffect(() => {
  localStorage.setItem("link1", link1);
},[link1]);

useEffect(() => {
  localStorage.setItem("link2", link2);
}, [link2]);

useEffect(() => {
  if (highlightId === null) {
    localStorage.removeItem("highlightId");
  } else {
    localStorage.setItem("highlightId", String(highlightId));
  }
}, [highlightId]);




return(

<section className="profile-public">
    

    {profilePageIndex === 0 && (
  <>
  <div className="profile-page">
    <div className="profile-header">
     <div className="avatar-wrap">
      <img src={profileImage || "/images/default-avatar.png"}
        alt="Profile"
        className="profile-avatar" />

   {viewMode === "owner" && (
         <>
      <label htmlFor="profileImageInput" className="avatar-edit-btn">
               📸
      </label>

       <input
          id="profileImageInput"
          type="file"
          accept="image/*"
          style={{display: "none"}}
          onChange={async (e) => {
            const file = e.target.files[0];
             if(!file) return;

            const dataUrl = await fileToDataUrl(file);
            setProfileImage(dataUrl);
            localStorage.setItem("profileImage", dataUrl);
               }}/>
         </>
      )}
  </div>
 </div>

 <div className="profile-main-info">

    <div className="profile-field">
      <span className="field-label">NICKNAME</span>

      {viewMode === "owner" ? (
        <input
        className="inline-name-input"
        value={editNickname}
        onChange={(e) => setEditNickname(e.target.value)}
        placeholder="닉네임" />
      ):(
      <span className="field-value">
      {viewMode === "guest" ? nickname : editNickname}      
      </span>
      )}


    <span className="last-answer-text">
      {recentAnswerText}
    </span>
   </div>
  </div>
  <div className="profile-row">
    <div className="account-connect-block">
      <span className="field-label">ACCOUNT</span>

      {viewMode === "owner" ? ( 
        isXConnected ? (
      <div className="connected-account-box"> 
        <span className="connected-id">@{connectedXId}</span>
        <span className="connected-badge">연동됨</span>

        <button
          type="button"
          className="x-disconnect-btn"
          onClick={() => {
            setIsXConnected(false);
            setConnectedXId("");
            localStorage.removeItem("isXConnected");
            localStorage.removeItem("connectedXId");
            localStorage.removeItem("twitterId");
          }}
          >
         해제
        </button>
      </div>
      ):(
        <div className="x-connect-row">
        <button
          type="button"
          className="x-connect-btn"
          onClick={handleConnectX}>
         트위터 연동
        </button>
        
        <span className="x-connect-status">미연동</span>
      </div>
       )
      ): isXConnected ? (
      <div className="connected-account-box"> 
        <span className="connected-id">@{connectedXId}</span>
        <span className="connected-badge">연동됨</span>
      </div>
      ):(
       <span className="x-connect-status">미연동</span>
      )}
     </div>
    </div>
      



 <div className="profile-bio"> 
  <p className="bio-text">Who am I</p>
  {viewMode === "owner" ? (
    <textarea
    className="profile-bio-input"
    value={bio}
    onChange={(e) => setBio(e.target.value)}
    placeholder="당신이 누군지 궁금해요" />
  ):(
  <div className="profile-bio-view">
  <p>(profileBio || "상태 메시지 없음")</p>
  </div>
  )}
 </div>

 <div className="profile-links">
   <div className="profile-link-row">
    <span className="field-label">LINK 1</span>
    {viewMode === "owner" ? (
      <input
      className="inline-link-input"
      value={link1}
      onChange={(e) => setLink1(e.target.value)}
      placeholder="링크를 추가하세요." />
    ):link1 ? (
      <a href={link1} target="_blank" rel="noreferrer" className="field-link">
        {link1}
      </a>
    ):(
    <span className="field-value empty">{link1 || "링크를 추가해보세요."}</span>
    )}
   </div>

     <div className="profile-link-row">
      <span className="field-label">LINK 2</span>
      {viewMode === "owner" ? (
      <input
      className="inline-link-input"
      value={link2}
      onChange={(e) => setLink2(e.target.value)}
      placeholder="링크를 추가하세요." />
      ):link2 ? (
      <a href={link2} target="_blank" rel="noreferrer" className="field-link">
      {link2}
      </a>
      ):(
      <span className="field-value empty">{link2 || "링크를 추가하세요."}</span>
      )}
     </div>
 </div>

 <div className="profile-like-row">
  <span>❤️{totalLikeCount}</span>
 </div>

 <span className="profile-stats-text">
    <span className="total-stats">총 {totalCards}건 </span>
    {"·"}
    답변 완료 {answeredCount}
    {"·"}
    비공개 {privateQuestionCount}
    {"·"}
    미답변 {unansweredCount}
 </span>


 <div className="profile-highlight">
    <h3>Highlight</h3>
  <div className="highlight-head">
  {highlightCard && (
    <span className="highlight-like-count">❤️ {highlightLikeCount}
  </span> )}
  </div>

  { highlightCard ? (
    <div className="pinnedCard">
      <p>{highlightCard.text}</p>
    </div>
  ):(
    <p className="highlight-empty">비어있습니다.</p>
  )}
  </div>
</div>
  </>
)}

  {viewMode === "owner" && profilePageIndex === 1 && (
  <>
    <div className="highlight-picker">
       <input
        value={highlightQuery}
        onChange={(e) => setHighlightQuery(e.target.value)}
        placeholder="질문 검색하기" 
        className="highlight-search-input" />

    <div className="highlight-search-list">
     {filteredHighlightCards.length > 0 ? (
      filteredHighlightCards.map((card) => (
        <button
         key={card.id}
         type="button"
         className={`highlight-option ${highlightId === card.id ? "active":""}`}
         onClick={() => setHighlightId(card.id)}>
        {card.text}
       </button>
      ))
    ):(
      <p className="highlight-no-result">검색 결과가 없습니다.</p>
    )}
    </div>
      <button
      type="button"
      className="highlight-clear-btn"
      onClick={() => setHighlightId(null)}>
    선택 해제
    </button>



  </div>
  


 <section className="profile-admin">
  <h3 className="setting" >Setting</h3>

   <h4 className="theme-select">Theme</h4>
   <select value={theme} onChange={(e) => setTheme(e.target.value)}>
    <option value="purple">Purple</option>
    <option value="blue">Blue</option>
    <option value="green">Green</option>
    <option value="yellow">Yellow</option>
    <option value="pink">Pink</option>
    <option value="custom">사용자 지정</option>
   </select>


 <div className="admin-card">
    <h4 className="background-select-text">Background</h4>

    <div className="background-actions">
    <label htmlFor="backgroundImageInput" className="background-select-btn">
      배경 선택
    </label>

    <input
      id="backgroundImageInput"
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const dataUrl = await fileToDataUrl(file);
        setBgUrl(dataUrl);
        localStorage.setItem("bgUrl", dataUrl);
      }}
      />


    <button
    type="button"
    className="background-clear-btn"
    onClick={() => {
      setBgUrl("");
      localStorage.removeItem("bgUrl");
    }}
    >
    초기화
    </button>
  </div>


  </div>




  </section>

</>
  )}

{viewMode === "owner" && (
<div className="profile-page-nav">
  <button
    type="button"
    onClick={() => setProfilePageIndex((prev) => Math.max(prev - 1,0))}
    disabled={profilePageIndex === 0}>
    ❮
  </button>

  <span>{profilePageIndex + 1} / 2</span>

  <button
    type="button"
    onClick={() => setProfilePageIndex((prev)  => Math.min(prev + 1,1))}
    disabled={profilePageIndex === 1}>
     ❯
  </button>
</div>
)}

  
 </section>
 );

}

