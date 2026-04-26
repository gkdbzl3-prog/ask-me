import { Navigate, useLocation } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
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
  const isLocalDev = import.meta.env.DEV;
  const routeUsername =
    pathParts[1] === "u" ? decodeURIComponent(pathParts[2] || "") : "";
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [profileImage, setProfileImage] = useState(
   localStorage.getItem("profileImage") || "");
  const [mobileTab, setMobileTab] = useState("chat");
  const [devViewMode, setDevViewMode] = useState("guest");
  const [connectedXId, setConnectedXid] = useState("idmulluhaeyadae");
  const [connectedXUserId, setConnectedXUserId] = useState("1324178327326748672");
  const isOwner = !isLocalDev && !!connectedXId && connectedXId === routeUsername;
  const viewMode = isLocalDev ? devViewMode : (isOwner ? "owner" : "guest");
  const [currentAuthUserId, setCurrentAuthUserId] = useState("");
  const [questionCards, setQuestionCards] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const questionDraftKey = `questionDraft:${routeUsername}`;
  const [zoomedImages, setZoomedImages] = useState([]);
  const [zoomedIndex, setZoomedIndex] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const [pinchStartDistance, setPinchStartDistance] = useState(null);
  const [pinchStartScale, setPinchStartScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragStartY, setDragStartY] = useState(null);
  const [panStartX, setPanStartX] = useState(0);
  const [panStartY, setPanStartY] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isDraggingZoom, setIsDraggingZoom] = useState(false);
  const [mouseStartX, setMouseStartX] = useState(0);
  const [mouseStartY, setMouseStartY] = useState(0);
  const [mousePanStartX, setMousePanStartX] = useState(0);
  const [mousePanStartY, setMousePanStartY] = useState(0);
  const zoomModalRef = useRef(null);
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [existingAnswerFiles, setExistingAnswerFiles] = useState([]);
  const [removedExistingFileUrls, setRemovedExistingFileUrls] = useState([]);
  const answerInputRef = useRef(null);
  const replyEditorRef = useRef(null);
  const [archivePosts, setArchivePosts] = useState([]);
  const [archiveSource, setArchiveSource] = useState("");

 
  const SAMPLE_QUESTIONS = [
  {
    id: "q1",
    text: "요즘 뭐하고 지내?",
    isPrivate: false,
    files: [],
    answer: "리액트 배우는 중!",
    answerFiles: [],
    answered: true,
    likeCount: 2,
    liked: false,
    createdAtISO: new Date().toISOString(),
    answeredAtISO: new Date().toISOString(),
    askerAuthId: "sample-auth-1",
  },
  {
    id: "q2",
    text: "사진 첨부 테스트",
    isPrivate: true,
    files: [
      {
        fileUrl: "/images/sample1.jpg",
        fileName: "sample1.jpg",
      },
    ],
    answer: "바보",
    answerFiles: [],
    answered: true,
    likeCount: 0,
    liked: false,
    createdAtISO: new Date().toISOString(),
    answeredAtISO: new Date().toISOString(),
    askerAuthId: "sample-auth-2",
  },
];



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

async function handleLike(questionId) {
  try {
    const res = await fetch(`/api/questions/${questionId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": currentAuthUserId,
      },
      body: JSON.stringify({
        likerAuthId: currentAuthUserId,
      }),
    });

  const result = await res.json();
  
  if (!res.ok) {
    alert(result.message || "좋아요 처리 실패");
    return;
  }

  setQuestionCards((prev) =>
    prev.map((card) =>
      card.id === questionId
        ? {
            ...card,
            liked: result.liked,
            likeCount: result.likeCount,
          }
        : card
    )
  );
} catch (error) {
  console.error("handlLike error:", error);
  alert("좋아요 처리 중 오류가 발생했습니다");
}
};

 const totalLikeCount = questionCards.reduce(
    (sum, card) => sum + (card.likeCount || 0), 0);

 const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    const trimmedInput = (input || "").trim();
    const hasFiles = Array.isArray(selectedFiles) && selectedFiles.length > 0;

    if (isSending) return;
    if (!trimmedInput && !hasFiles) return;

    setIsSending(true);

    try {
        if (!routeUsername) {
          alert("유저 페이지에서만 질문을 보낼 수 있습니다.");
          return;
        }

      if (viewMode === "owner" && replyTargetId === null) {
        alert("먼저 질문을 선택해주세요");
        return;
      }
      
      console.log("handleSend start", {
      input,
      trimmedInput,
      selectedFiles,
      routeUsername,
      viewMode,
      secret,
      currentAuthUserId,
    });

      if (viewMode === "owner" && replyTargetId !== null) {
        let uploadedAnswerFiles = [];

      if (hasFiles) {
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


        if (!res.ok) {
          alert(result.message || "답변 저장을 실패했습니다");
          return;
        }

        if (isEditingAnswer) {
          setJustEditedAnswerId(replyTargetId);
          setTimeout(() => {
            setJustEditedAnswerId(null);
          }, 2500);
        }


        await loadQuestionsByUsername(routeUsername);

    
        setRemovedExistingFileUrls([]);
        setIsEditingAnswer(false);
        setExistingAnswerFiles([]);
        setInput("");
        setReplyTargetId(null);
        setSelectedFiles([]);
        setSecret(false);
        setShowPreview(false);
        return;
      }
   
  

      let uploadedFiles = [];
 
      if (hasFiles) {
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

      const res = await fetch(`/api/users/${routeUsername}/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: trimmedInput,
            isPrivate: secret,
            files: uploadedFiles,
            askerAuthId: currentAuthUserId,
          }),
        });

      
      const result = await res.json();
      console.log("POST status:", res.status);
      console.log("POST result:", result);
 


        if (!res.ok) {
           alert(             
             `질문 저장 실패: ${result.message || "알 수 없는 오류"}${      
             result.error ? "\n" + JSON.stringify(result.error) : ""    
             }`
           );
          return;
      }
      

      localStorage.removeItem(questionDraftKey);

      setInput("");
      setSecret(false);
      setSelectedFiles([]);
      setShowPreview(false);
      setReplyTargetId(null);
      await loadQuestionsByUsername(routeUsername);      
    } catch (error) {
      console.error("handleSend error:", error);
      alert("전송 중 오류가 발생했습니다");
    } finally {
      setIsSending(false);
    }
  }


  async function removeQuestion(questionId) {
    try {
      const requesterAuthId = currentAuthUserId || "";
      const requesterXUserId = localStorage.getItem("connectedXUserId") || "";
      
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requesterAuthId,
          requesterXUserId,
        }),
      });

      const result = await res.json();
      console.log("delete question result:", result);

      if (!res.ok) {
        alert("질문 삭제 실패");
        return;
      }


      await loadQuestionsByUsername(routeUsername);
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

  function ArchiveGallery({
    posts,
    source,
    viewMode,
    onToggleVisibility,
  }) {

  return (
    <section className="archive-box">
     <div className="archive-title-row">
      <h3 className="archive-title">Archive</h3>
      {source ===  "mock" && (
        <p className="archive-source-badge">sample</p>
      )}
    </div>

     <div className="archive-grid">
        {posts.map((group) => {
        const archiveImages =
            group.posts
              ?.flatMap((post) =>
                (post.images || []).map((image, imageIndex) => ({
                  post,
                  image,
                  imageIndex,
        }))
      )
        .slice(0, 4) || [];

        return (
        <div key={group.hashtag} className="archive-card">
         <div className="archive-head">
          <p className="archive-hashtag">#{group.hashtag}</p>
          <span className="archive-count">총{group.count}개</span>
         </div>

        <div className={`archive-images image-count-${Math.min(archiveImages.length, 4)}`}>
              {archiveImages.map(({ post, image, imageIndex }) => {
                console.log("archive post:", post);
                
                return (
                  <div
                    className={`archive-image-wrap ${post.hidden ? "is-hidden" : ""}`}
                    key={`${post.id}-${imageIndex}`}>
                    <img
                      src={image}
                      alt={post.text || `archive-${group.hashtag}`}
                    />

                    {viewMode === "owner" && imageIndex === 0 && (
                      <button
                        type="button"
                        className="archive-hide-btn"
                        onClick={() =>
                          onToggleVisibility(post.id, !post.hidden)
                        }
                      >
                        {post.hidden ? "show" : "hide"}
                      </button>
                    )}
                  </div>
                );
              })}
        </div>
      </div>
        );
      })}
      </div>
    </section>
  );
 }


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
    const requesterAuthId = currentAuthUserId || "";
    const res = await fetch(
      `/api/users/${username}/questions?requesterAuthId=${encodeURIComponent(requesterAuthId)}`);
   
  if (!res.ok) {
    throw new Error("questions load failed");
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

  function openImageZoom(images, startIndex = 0) {
    setZoomedImages(images);
    setZoomedIndex(startIndex);
    setShowImageZoom(true);
  }

  function closeImageZoom() {
    setShowImageZoom(false);
    setZoomedImages([]);
    setZoomedIndex(0);
  }

  function goPrevZoomImage() {
    setZoomedIndex((prev) => prev === 0 ? zoomedImages.length - 1 : prev - 1
    );
  }

  function goNextZoomImage() {
    setZoomedIndex((prev) =>
      prev === zoomedImages.length - 1 ? 0 : prev + 1
    );
  }

  function handleZoomTouchStart(e) {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  }

  function handleZoomTouchMove(e) {
    setTouchEndX(e.targetTouches[0].clientX);
  }

  function handleZoomTouchEnd() {
    if (zoomedImages.length <= 1) return;
    if (touchStartX === null || touchEndX === null) return;

    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      goNextZoomImage();
    } else if (distance < -minSwipeDistance) {
      goPrevZoomImage();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  }

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function resetZoomState() {
    setZoomScale(1);
    setPanX(0);
    setPanY(0);
    setPinchStartDistance(null);
    setPinchStartScale(1);
    setIsPinching(false);
    setDragStartX(null);
    setDragStartY(null);
    setPanStartX(0);
    setPanStartY(0);
    setTouchStartX(null);
    setTouchEndX(null);
    setIsDraggingZoom(false);
    setMouseStartX(0);
    setMouseStartY(0);
    setMousePanStartX(0);
    setMousePanStartY(0);
  }

  function openImageZoom(images, startIndex = 0) {
    setZoomedImages(images);
    setZoomedIndex(startIndex);
    setShowImageZoom(true);
    resetZoomState();
  }

  function closeImageZoom() {
    setShowImageZoom(false);
    setZoomedImages([]);
    setZoomedIndex(0);
    resetZoomState();
  }

  function goPrevZoomImage() {
    setZoomedIndex((prev) =>
      prev === 0 ? zoomedImages.length - 1 : prev - 1
    );
    resetZoomState();
  }

  function goNextZoomImage() {
    setZoomedIndex((prev) =>
      prev === zoomedImages.length - 1 ? 0 : prev + 1
    );
    resetZoomState();
  }

  function handleZoomTouchStart(e) {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      setIsPinching(true);
      setPinchStartDistance(distance);
      setPinchStartScale(zoomScale);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];

      if (zoomScale > 1) {
        setDragStartX(touch.clientX);
        setDragStartY(touch.clientY);
        setPanStartX(panX);
        setPanStartY(panY);
      } else {
        setTouchEndX(null);
        setTouchStartX(touch.clientX);
      }
    }
  }

  function handleZoomTouchMove(e) {
    if (e.touches.length === 2 && pinchStartDistance) {
      const newDistance = getTouchDistance(e.touches);
      const nextScale = (newDistance / pinchStartDistance) * pinchStartScale;

      const clampedScale = Math.max(1, Math.min(nextScale, 4));

      if (clampedScale <= 1) {
        setPanX(0);
        setPanY(0);
      }

      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];

      if (zoomScale > 1 && dragStartX !== null && dragStartY !== null) {
        const dx = touch.clientX - dragStartX;
        const dy = touch.clientY - dragStartY;

        setPanX(panStartX + dx);
        setPanY(panStartY + dy)
      } else {
        setTouchEndX(touch.clientX);
      }
    }
  }


  function handleZoomTouchEnd() {
    if (isPinching) {
      setIsPinching(false);
      setPinchStartDistance(null);
      return;
    }

    if (zoomScale > 1) {
      setDragStartX(null);
      setDragStartY(null);
      return;
    }
    
    if (zoomedImages.length <= 1) return;
    if (touchStartX === null || touchEndX === null) return;

    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      goNextZoomImage();
    } else if (distance < -minSwipeDistance) {
      goPrevZoomImgae();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  }



  function handleZoomWheel(e) {
    if (e.ctrlKey) return;

    const delta = e.deltaY;
    const zoomStep = 0.2;
    setZoomScale((prev) => {
      const next = delta < 0 ? prev + zoomStep : prev - zoomStep;
      const clamped = Math.max(1, Math.min(next, 4));

      if (clamped <= 1) {
        setPanX(0);
        setPanY(0);
      }
    
      return clamped;
    });
  }

  function handleZoomMouseDown(e) {
    if (zoomScale <= 1) return;

    e.preventDefault();
    setIsDraggingZoom(true);
    setMouseStartX(e.clientX);
    setMouseStartY(e.clientY);
    setMousePanStartX(panX);
    setMousePanStartY(panY);
  }

  function handleZoomMouseMove(e) {
    if (!isDraggingZoom) return;

    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;

    setPanX(mousePanStartX + dx);
    setPanY(mousePanStartY + dy);
  }

  function handleZoomMouseUp() {
    setIsDraggingZoom(false);
  } 

  function handleZoomMouseLeave() {
    setIsDraggingZoom(false);
  }

  function startEditAnswer(card) {
    setIsEditingAnswer(true);
    setEditingQuestionId(card.id);
    setInput(card.answer || "");
    setExistingAnswerFiles(card.answerFiles || []);
    setSelectedFiles([]);
    setRemovedExistingFileUrls([]);
  }

  function removeExistingAnswerFile(fileId) {
    SETrEMOVEDeXISTINGfileUrls((prev) => [...prev, fileId]);
  }

  function resetAnswerEditState() {
    setIsEditingAnswer(false);
    setEditingQuestionId(nul);
    setInput("");
    setExistingAnswerFiles([]);
    setSelectedFiles([]);
    setRemovedExistingFileUrls([]);
  }

  function resetReplyEditState() {
    setReplyTargetId(null);
    setInput("");
    setExistingAnswerFiles([]);
    setSelectedFiles([]);
    setRemovedExistingFileUrls([]);
  }

  function startReply(card) {
    setReplyTargetId(card.id);
    setInput("");
    setExistingAnswerFiles([]);
    setSelectedFiles([]);
    setRemovedExistingFileUrls([]);
    requestAnimationFrame(() => {
      answerInputRef.current?.focus();
      answerInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function startEditReply(card) {
    setReplyTargetId(card.id);
    setInput(card.answer || "");
    setExistingAnswerFiles(card.answerFiles || []);
    setSelectedFiles([]);
    setRemovedExistingFileUrls([]);
    requestAnimationFrame(() => {
      answerInputRef.current?.focus();
      answerInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function resetReplyEditState() {
    setReplyTargetId(null);
    setInput("");
    setExistingAnswerFiles([]);
    setSelectedFiles([]);
    setRemovedExistingFileUrls([]);
  }

    async function loadArchiveHashtags() {
      if (!connectedXUserId || !connectedXId) return;
      
      const params = new URLSearchParams({
        ownerId: connectedXUserId,      
        username: connectedXId,        
      });
      
      if (viewMode === "owner") {
        params.set("includeHidden", "true");
      }


      const res = await fetch(`/archive/hashtags?${params.toString()}`);
      
      if (!res.ok) {
        console.error("archive load failed:", await res.text());
        return;
      }
        const data = await res.json();

       
      setArchivePosts(data.hashtags || []);    
      setArchiveSource(data.source || "");
  }

  async function toggleArchivePostVisibility(postId, hidden) {
    if (!postId) {
      console.error("postId 없음", { postId, hidden })
      return;
    }

    const params = new URLSearchParams({
      ownerId: connectedXUserId,
      username: connectedXId,
      includeHidden: "true",
    });

    const res = await fetch(
      `/archive/posts/${encodeURIComponent(postId)}/visibility?${params.toString()}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "appiication/json",
        },
        credentials: "include",
        body: JSON.stringify({ hidden }),
      }
    );

    if (!res.ok) {
      console.error("archive visibility failed:", await res.text());
      return;
    }

    await loadArchiveHashtags();
  }






  useEffect(() => {
    if (showImageZoom) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showImageZoom]);


  useEffect(() => {
    if (!showImageZoom) return;
    setZoomScale(1);
    setPanX(0);
    setPanY(0);
  }, [zoomedIndex, showImageZoom]);


  useEffect(() => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9af]{3}-[0-9a-f][12]$/i;
    
    let authId = localStorage.getItem("authId");

const createFallbackId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

if (!authId || !uuidRegex.test(authId)) {
  authId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : createFallbackId();

  localStorage.setItem("authId", authId);
}


    setCurrentAuthUserId(authId);
  }, []);

  useEffect(() => {
    loadArchiveHashtags();
  }, [connectedXUserId, connectedXId, viewMode]);

 


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
      setQuestionCards(SAMPLE_QUESTIONS);
      return;
    }
  
 loadQuestionsByUsername(routeUsername).catch((err) =>
  console.error("questions fetch error:", err)
 );
},[routeUsername]);

  useEffect(() => {
    if (!routeUsername) return;

    const raw = localStorage.getItem(questionDraftKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      setInput(parsed.input || "");
      setSecret(!!parsed.secret);
    } catch (error) {
      console.error("question draft parse error:", error);
    }
  }, [questionDraftKey, routeUsername]);

  useEffect(() => {
    if (!routeUsername) return;

    localStorage.setItem(
      questionDraftKey,
      JSON.stringify({
        input,
        secret,
      })
    );
  }, [questionDraftKey, routeUsername, input, secret]);


  useEffect(() => {
    const el = zoomModalRef.current;
    if (!el || !showImageZoom) return;

    function onWheel(e) {
      if (e.ctrlKey) return;
      e.preventDefault();

      const delta = e.deltaY;
      const zoomStep = 0.2;

      setZoomScale((prev) => {
        const next = delta < 0 ? prev + zoomStep : prev - zoomStep;
        const clamped = Math.maz(1, Math.min(next, 4));

        if (clamped <= 1) {
          setPanX(0);
          setPanY(0);
        }

        return clamped;
      });
    }

    el.addEventListener("whell", onWheel, { passive: false });

    return () => {
      el.removeEventListener("whell", onWheel);
    };
  }, [showImageZoom]);


  useEffect(() => {
    if (replyTargetId === null) return;

    function handleDocumentClick(e) {
      if (!replyEditorRef.current) return;
      if (replyEditorRef.current.contains(e.target)) return;

      resetReplyEditState();
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [replyTargetId]);

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

        <h1 onClick={() => setMobileTab("chat")}>Ask me</h1>

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



<div className="mobile-tabs">
  <button className={`nav-btn ${mobileTab === "profile" ? "active" : ""}`}
   onClick={() => setMobileTab("profile")}>
    Profile
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
          {mobileTab === "chat" && (

            <section className={`card-list ${viewMode}-view`}>
              {questionCards.length === 0 ? (
                <p>질문이 없음</p>
              ) : (

                questionCards.map((card) => {

                  const hasAnswer = !!card.answer ||
                    (Array.isArray(card.answerFiles) && card.answerFiles.length > 0);
                  const canDeleteQuestion = viewMode === "owner" || card.askerAuthId === currentAuthUserId;

                  return (
                    <React.Fragment key={card.id}>

                     
                      <article className={`question-card-only ${card.isPrivate ? "private" : ""} ${hasAnswer ? "answered" : ""}`}>
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
                                  <p className="question-text">{card.text}</p>
                                  <p className="meta">{formatDisplayDate(card.createdAtISO || card.createdAt)}</p>
                                </>
                              )}

                              {card.files?.length > 0 && (
                                <div className={`question-file-grid ${card.files.length === 1 ? "single" : "multi"}`}>
                                  {card.files.map((file, index) => (
                                    <div className="question-file-item" key={index}>
                                      <img src={file.fileUrl || file.url || ""}
                                        alt={file.fileName || `첨부이미지-${index + 1}`}
                                        onClick={() => openImageZoom(card.files, index)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          </div>


                          <div className="question-actions">


                          {hasAnswer && (
                            <div className="question-side check-side">
                              <span className="answered-mark">
                                <img className="check-img" src="/images/체크.png" alt="읽음" />
                              </span>
                            </div>
                          )}

                            {viewMode === "owner" && (
                              <button
                                className="reply-btn"
                                onClick={() => {
                                  setReplyTargetId(card.id);
                                  setIsEditingAnswer(false);
                                  setInput("");
                                  setExistingAnswerFiles([]);                                  
                                  setRemovedExistingFileUrls([]);
                                  setSelectedFiles([]);
                                  requestAnimationFrame(() => {
                                    answerInputRef.current?.focus();
                                    answerInputRef.current?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    });
                                  });
                                }}>
                                답변하기
                              </button>
                            )}
                          </div>                         




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
                      </article> 

                    
                      {hasAnswer && (
                        <article className="answer-card-only">
                          <div className="answer-line">

                                {viewMode === "owner" && hasAnswer && (
                                  <button
                                    className="answer-edit-btn"
                                    onClick={() => {
                                      setReplyTargetId(card.id);
                                      setIsEditingAnswer(true);
                                      setInput(card.answer || "");
                                      setExistingAnswerFiles(card.answerFiles || []);
                                      setSelectedFiles([]);
                                      setRemovedExistingFileUrls([]);
                                      requestAnimationFrame(() => {
                                        answerInputRef.current?.focus();
                                        answerInputRef.current?.scrollIntoView({
                                          behavior: "smooth",
                                          block: "center",
                                        });
                                      });
                                    }}>
                                    답변수정
                                  </button>
                                )}                           
                            

                            {viewMode === "owner" && (
                              <button
                                className="answer-delete-btn"
                                onClick={() => removeAnswer(card.id)}>
                                ×
                              </button>
                            )}

                            {viewMode === "guest" && (
                              <div className="answer-side like-side">
                                <button
                                  className="like-btn"
                                  onClick={() => handleLike(card.id)}>
                                  {card.liked ? "❤️" : "🩶"}
                                </button>
                              </div>
                            )}





                            <div className="answer-box-wrap">
                              <div className="answer-box">
                                <p className="answer-text">{card.answer}</p>

                               

                                {card.answerFiles?.length > 0 && (
                                  <div className={`answer-file-grid ${card.answerFiles.length === 1 ? "single" : "multi"}`}>
                                    {card.answerFiles.map((file, index) => (
                                      <div className="answer-file-item" key={index}>
                                        <img
                                          src={file.fileUrl || file.url || ""}
                                          alt={file.fileName || `첨부이미지-${index + 1}`}
                                          onClick={() => openImageZoom(card.answerFiles, index)}
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
                              </div>
                            </div>

                          </div>
                        </article>
                      )}

                    </React.Fragment>
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

              {showImageZoom && zoomedImages.length > 0 && (
                <div className="image-zoom-modal" onClick={closeImageZoom}>
                  <div
                    ref={zoomModalRef}
                    className="image-zoom-medal-content"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={handleZoomTouchStart}
                    onTouchMove={handleZoomTouchMove}
                    onTouchEnd={handleZoomTouchEnd}
                    onWheel={handleZoomWheel}
                    onMouseDown={handleZoomMouseDown}
                    onMouseUp={handleZoomMouseUp}
                    onMouseLeave={handleZoomMouseLeave}>
                    <button
                      type="button"
                      className="image-zoom-close"
                      onClick={closeImageZoom}>
                      ×
                    </button>
                    
                
                    <img src={zoomedImages[zoomedIndex]?.fileUrl || zoomedImages[zoomedIndex]?.url || ""}
                      alt={zoomedImages[zoomedIndex]?.fileName || `확대 이미지 ${zoomedIndex + 1}`}
                      className={[
                        "zoom-img",
                        zoomScale > 1 ? "zoomed" : "",
                        isDraggingZoom ? "dragging" : "",
                      ].join(" ").trim()}
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${zoomScale})`,
                        transition: isPinching || isDraggingZoom ? "none" : "transform 0.18s ease",
                        cursor: zoomScale > 1 ? (isDraggingZoom ? "grabbing" : "grab") : "zoom-in",
                      }}                  
                      onTouchStart={handleZoomTouchStart}
                      onTouchMove={handleZoomTouchMove}
                      onTouchEnd={handleZoomTouchEnd}
                    />


                    {zoomedImages.length > 1 && (
                      <button
                        type="button"
                        className="image-zoom-nav prev"
                        onClick={goPrevZoomImage}>
                      
                        ‹
                      </button>
                    )}

                  

                    {zoomedImages.length > 1 && (
                      <button
                        type="button"
                        className="image-zoom-nav next"
                        onClick={goNextZoomImage}>
                    ›
                  </button>
                    )}
                    

                    <div className="image-zoom-counter">
                      {zoomedIndex + 1} / {zoomedImages.length}
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
                              alt={`보낼 이미지 ${index + 1}`}
                             />
                                                                                              
                            <button                        
                              type="button"                        
                              className="selected-file-remove-btn"                        
                              onClick={() => {                          
                                setSelectedFiles((prev) => prev.filter((_, i) => i !== index));                        
                              }}>                                                          
                              ×
                            </button>

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

                    </div>
               </div>
                )}
                <div ref={replyEditorRef}>
    <div className="ask-input-shell">
      {viewMode === "guest" && (
      <button
        className={`secret-toggle ${secret ? "on" : ""}`}
        onClick={() => setSecret(!secret)}
      >
                      {secret ? "◉" : "◎"} Secret
      </button>)}

                    {viewMode === "owner" && replyTargetId !== null && (
                      <div className={`replying-bar ${isEditingAnswer ? "is-editing" : ""}`}>
                        <span className="replying-bar-text">
                          {replyTargetCard && (isEditingAnswer
                            ? `"${replyTargetCard.text}" 수정 중`
                            : `"${replyTargetCard.text}"에 답하는 중`)}
                        </span>


                      </div>
                    )}
                  

                  {replyTargetId !== null && existingAnswerFiles.length > 0 && (
                    <div className="existing-answer-files">
                      {existingAnswerFiles
                        .filter((file) => !removedExistingFileUrls.includes(file.fileUrl || file.url))
                        .map((file) => (
                          <div className="existing-answer-file-item" key={file.fileUrl || file.url}>
                            <img src={file.url || file.fileUrl} alt={file.name || file.fileName || "기존 첨부"} />
                            <button
                              type="button"
                              onClick={() => removeExistingAnswerFile(file.fileUrl || file.url)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {selectedFiles.length > 0 && (
                    <div className="new-answer-files">
                      {selectedFiles.map((file, index) => (
                        <div className="new-answer-file-item" key={`${file.name}-${index}`}>
                          <img src={URL.createObjectURL(file)} alt={file.name || `새 첨부 ${index + 1}`} />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                            }}>
                            ×
                          </button>
                        </div>
                      ))}
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
                        ref={answerInputRef}
                        value={input}                
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
                            : `${nickname}님에게 하고 싶은 말을 적어보세요!`} />

          
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
              </div>
  </section>
)}
</main>

 <aside className="archive-panel">
          <ArchiveGallery
            posts={archivePosts}
            source={archiveSource}
            viewMode={viewMode}
            onToggleVisibility={toggleArchivePostVisibility} />
 </aside>
 </div>
</div>

</>
);
}

export default App;
