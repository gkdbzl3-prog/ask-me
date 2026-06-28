import { Navigate, useLocation } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import ProfileHeader from "./ProfileHeader";
import { supabase } from "./supabaseClient";
import LandingPage from "./LandingPage";
import { enablePush, initNativePushListeners } from "./notifications";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";


function ArchiveGallery({
  posts,
  source,
  viewMode,
  isArchiveEditing,
  onToggleEdit,
  onToggleVisibility,
  onToggleCollapsed,
  onSyncArchive,
}) {

  return (
    <section className="archive-box">
      <div className="archive-title-row">
        <h3 className="archive-title">Archive</h3>


        {(source === "mock" || viewMode === "owner") && (
          <div className="archive-title-actions">
            {source === "mock" && (
              <p className="archive-source-badge">sample</p>
            )}

            {viewMode === "owner" && (
              <>
                <button type="button"
                  className="archive-sync-btn"
                  onClick={onSyncArchive}>
                  sync
                </button>

                <button
                  type="button"
                  className={`archive-edit-toggle ${isArchiveEditing ? "active" : ""}`}
                  onClick={onToggleEdit}>
                  {isArchiveEditing ? "완료" : "편집"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="archive-grid">
        {posts.map((group) => {
          const MAX_THUMBS = 10;
          const archiveMedia =
            group.posts
              ?.flatMap((post) => {
                const items = post.media?.length
                  ? post.media
                  : (post.images || []).map((url) => ({
                    type: "photo",
                    url,
                    previewUrl: url,
                  }));

                if (post.collapsed) {
                  return [
                    {
                      post,
                      item: items[0] || null,
                      mediaIndex: 0,
                      isCollapsedTile: true,
                    },
                  ];
                }

                return items.map((item, mediaIndex) => ({
                  post,
                  item,
                  mediaIndex,
                  isHiddenTile: false,
                }));
              })
              .slice(0, MAX_THUMBS) || [];

          return (
            <div key={group.hashtag} className="archive-card">
              <div className="archive-head">
                <p className="archive-hashtag">#{group.hashtag}</p>
                <span className="archive-count">총{group.count}개</span>
              </div>

              <div className={`archive-images image-count-${Math.min(archiveMedia.length, 10)}`}>
                {archiveMedia.map(({ post, item, mediaIndex, isHiddenTile, isCollapsedTile }) => (
                  <div
                    className={`archive-image-wrap ${isHiddenTile ? "is-hidden is-collapsed" : ""
                      }`}
                    key={`${post.id}-${mediaIndex}`}
                    onClick={() => {
                      if (!isHiddenTile && post.postUrl) {
                        window.open(post.postUrl, "_blank", "noopener,noreferrer");
                      }
                    }}>
                    {isCollapsedTile ? (
                      <div className="archive-hidden-tile">
                        <span>접기</span>
                      </div>
                    ) :
                      item?.type === "video" || item?.type === "animated_gif" ? (
                        <div className="archive-video-thumb">
                          <img
                            src={item.previewUrl}
                            style={{
                              objectFit: "cover",
                              objectPosition: `${item.crop?.x || 50}% ${item.crop?.y || 50}%`,
                              transform: `scale(${item.crop?.zoom || 1})`,
                            }}
                            alt={post.text || `archive-video-${group.hashtag}`}
                          />
                          <span className="archive-play-badge">
                            {item.type === "animated_gif" ? "GIF" : "▶"}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={item?.url}
                          style={{
                            objectFit: "cover",
                            objectPosition: `${item?.crop?.x || 50}% ${item?.crop?.y || 50}%`,
                            transform: `scale(${item?.crop?.zoom || 1})`,
                          }}
                          alt={post.text || `archive-${group.hashtag}`}
                        />
                      )}



                    {viewMode === "owner" && isArchiveEditing && mediaIndex === 0 && (
                      <div className="archive-edit-actions">
                        <button
                          type="button"
                          className="archive-hide-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapsed(post.id, !post.collapsed);
                          }}
                        >
                          {post.collapsed ? "펼치기" : "접기"}
                        </button>

                        <button
                          type="button"
                          className="archive-hide-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(post.id, !post.hidden);
                          }}
                        >
                          {post.hidden ? "show" : "hide"}
                        </button>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}



function App() {
  const [input, setInput] = useState("");
  const [nickname, setNickname] = useState("날");
  const [profileBio, setProfileBio] = useState("");
  const [secret, setSecret] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [bgUrl, setBgUrl] = useState(localStorage.getItem("bgUrl") || "");
  const pathParts = window.location.pathname.split("/");
  const isLocalDev =
    import.meta.env.DEV ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.");
  const [theme, setTheme] = useState("purple");
  const routeUsername =
    pathParts[1] === "u" ? decodeURIComponent(pathParts[2] || "") : "";
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem("profileImage") || "");
  const [mobileTab, setMobileTab] = useState("chat");
  const [devViewMode, setDevViewMode] = useState("guest");
  const [connectedXId, setConnectedXid] = useState(
    () => localStorage.getItem("connectedXId") || ""
  );
  const [connectedXUserId, setConnectedXUserId] = useState(
    () => localStorage.getItem("connectedXUserId") || ""
  );
  const [profileXUserId, setProfileXUserId] = useState("");
  const isOwner = !isLocalDev && !!connectedXId && connectedXId === routeUsername;
  const viewMode = isLocalDev ? devViewMode : (isOwner ? "owner" : "guest");
  const [questionCards, setQuestionCards] = useState([]);
  const [toast, setToast] = useState(null);
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
  const [isArchiveEditing, setIsArchiveEditing] = useState(false);
  const [justEditedAnswerId, setJustEditedAnswerId] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("notificationSettings")) || {
        newQuestion: false,
        newAnswer: true,
        archiveSync: false,
      };
    } catch {
      return {
        newQuestion: true,
        newAnswer: true,
        archiveSync: false,
      };
    }
  });



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


  const activeQuestionCards = routeUsername ? questionCards : SAMPLE_QUESTIONS;
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
          "Content-Type": "application/json",
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

  function showToast(message) {
    setToast({ text: message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  const totalLikeCount = questionCards.reduce(
    (sum, card) => sum + (card.likeCount || 0), 0);

  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    const trimmedInput = (input || "").trim();
    const hasFiles = Array.isArray(selectedFiles) && selectedFiles.length > 0;
    const keptExistingAnswerFiles = existingAnswerFiles.filter(
      (file) => !removedExistingFileUrls.includes(file.fileUrl || file.url)
    );

    if (isSending) return;
    if (!trimmedInput && !hasFiles && keptExistingAnswerFiles.length === 0) return;

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
            answerFiles: [...keptExistingAnswerFiles, ...uploadedAnswerFiles],
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




      if (!res.ok) {
        alert(
          `질문 저장 실패: ${result.message || "알 수 없는 오류"}${result.error ? "\n" + JSON.stringify(result.error) : ""
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
      enablePush({ authId: currentAuthUserId }).catch(() => { });
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


      if (!res.ok) {
        alert("질문 삭제 실패");
        return;
      }


      await loadQuestionsByUsername(routeUsername);
    } catch (error) {
      alert("질문 삭제 중 오류 발생");
    }
  }

  async function removeAnswer(questionId) {
    try {
      const res = await fetch(`/api/questions/${questionId}/answer/delete`, {
        method: "PATCH",
      });

      const result = await res.json();


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

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  function getRecentAnswerText(questionCards, nowMs) {
    const answeredCards = Array.isArray(questionCards)
      ? questionCards.filter((card) => card.answered)
      : [];

    if (answeredCards.length === 0) return "답변 없음";

    const latestAnswered = answeredCards
      .map((card) => card.answeredAtISO || card.createdAtISO)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];

    if (!latestAnswered) return "답변 없음";

    const diffMs = nowMs - new Date(latestAnswered).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "최근 답변 오늘";
    if (diffDays === 1) return "최근 답변 1일 전";
    return `최근 답변 ${diffDays}일 전`;
  }

  const recentAnswerText = getRecentAnswerText(activeQuestionCards, nowMs);
  const totalCards = activeQuestionCards.length;
  const answeredCount = activeQuestionCards.filter((card) => card.answered).length;
  const privateQuestionCount = activeQuestionCards.filter((card) => card.isPrivate).length;
  const unansweredCount = activeQuestionCards.filter((card) => !card.answered).length;

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
          isMine: q.isMine,
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
      goPrevZoomImage();
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
    setRemovedExistingFileUrls((prev) => [...prev, fileId]);
  }

  function resetAnswerEditState() {
    setIsEditingAnswer(false);
    setEditingQuestionId(null);
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



  const loadArchiveHashtags = React.useCallback(async () => {

    if (!profileXUserId || !routeUsername) return;

    const params = new URLSearchParams({
      ownerId: profileXUserId,
      username: routeUsername,
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
  }, [profileXUserId, routeUsername, viewMode]);

  async function toggleArchivePostVisibility(postId, hidden) {
    if (!postId) {
      console.error("postId 없음", { postId, hidden })
      return;
    }

    setArchivePosts((prev) =>
      prev.map((group) => ({
        ...group,
        posts:
          group.posts?.map((post) =>
            post.id === postId ? { ...post, hidden } : post
          ) || [],
      }))
    );

    const res = await fetch(
      `/archive/posts/${encodeURIComponent(postId)}/visibility`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ hidden }),
      }
    );

    if (!res.ok) {
      console.error("archive visibility failed:", await res.text());
      await loadArchiveHashtags();
      return;
    }

    await loadArchiveHashtags();
  }

  async function toggleArchivePostCollapsed(postId, collapsed) {
    if (!postId) return;

    setArchivePosts((prev) =>
      prev.map((group) => ({
        ...group,
        posts:
          group.posts?.map((post) =>
            post.id === postId ? { ...post, collapsed } : post
          ) || [],
      }))
    );

    const res = await fetch(
      `/archive/posts/${encodeURIComponent(postId)}/collapsed`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ collapsed }),
      }
    );

    if (!res.ok) {
      console.error("archive collapsed failed:", await res.text());
      await loadArchiveHashtags();
      return;
    }

    await loadArchiveHashtags();
  }


  function handleToggleArchiveEdit() {
    setIsArchiveEditing((prev) => !prev);
  }

  const [currentAuthUserId, setCurrentAuthUserId] = useState(() => {
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

    return authId;
  });


  async function syncArchive() {
    if (!profileXUserId || !routeUsername) {
      alert("X 연동 정보가 없어서 동기화할 수 없어요.");
      return;
    }

    const params = new URLSearchParams({
      ownerId: profileXUserId,
      username: routeUsername,
    });

    const res = await fetch(`/archive/sync?${params.toString()}`, {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json();


    if (!res.ok) {
      alert(data.message || "아카이브 동기화 실패");
      return;
    }

    setArchivePosts(data.hashtags || []);
    setArchiveSource(data.source || "x");
  }

  async function handleToggleArchiveCollapsed(postId, nextCollapsed) {
    setArchivePosts((prev) =>
      prev.map((group) => ({
        ...group,
        posts: group.posts.map(
          (post) =>
            post.id === postId
              ? { ...post, collapsed: nextCollapsed }
              : post
        ),
      }))
    );

    await fetch(`/archive/posts/${postId}/collapsed`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collapsed: nextCollapsed }),
    });

    await loadArchiveHashtags();
  }

  const chatScrollRef = useRef(null);
  const profileScrollRef = useRef(null);
  const archiveScrollRef = useRef(null);


  const savedScroll = useRef(0);
  const savedProfileScroll = useRef(0);
  const savedArchiveScroll = useRef(0);
  const didInitialScroll = useRef(false);

  const restoredScrollFor = useRef(null);
  const restoredProfileScrollFor = useRef(null);
  const restoredArchiveScrollFor = useRef(null);

  const chatScrollKey = `chatScroll:${routeUsername || "default"}`;
  const profileScrollKey = `profileScroll:${routeUsername || "default"}`;
  const archiveScrollKey = `archiveScroll:${routeUsername || "default"}`;


  function getPanelScrollPos(ref) {
    const el = ref.current;
    const elScroll = el ? el.scrollTop : 0;
    const winScroll = window.scrollY || document.documentElement.scrollTop || 0;
    return elScroll || winScroll;
  }

  function setChatScrollPos(value) {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = value;
    window.scrollTo(0, value);
  }


  function setProfileScrollPos(value) {
    const el = profileScrollRef.current;
    if (el) el.scrollTop = value;
    if (mobileTab === "profile") window.scrollTo(0, value);
  }

  function setArchiveScrollPos(value) {
    const el = archiveScrollRef.current;
    if (el) el.scrollTop = value;
    if (mobileTab === "archive") window.scrollTo(0, value);
  }

  function handleChatScroll() {
    savedScroll.current = getPanelScrollPos(chatScrollRef);
    sessionStorage.setItem(chatScrollKey, String(savedScroll.current));
  }

  function handleProfileScroll() {
    savedProfileScroll.current = getPanelScrollPos(profileScrollRef);
    sessionStorage.setItem(profileScrollKey, String(savedProfileScroll.current));
  }

  function handleArchiveScroll() {
    savedArchiveScroll.current = getPanelScrollPos(archiveScrollRef);
    sessionStorage.setItem(archiveScrollKey, String(savedArchiveScroll.current));
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function handleNativeAuthUrl(url, source) {
      console.log("native auth url received:", { source, url });
      if (!url?.startsWith("askme://")) return;
      const code = new URLSearchParams(url.split("?")[1] || "").get("code");
      if (!code) {
        console.error("native auth url missing code:", { source, url });
        return;
      }
      const res = await fetch(`/auth/x/exchange?code=${encodeURIComponent(code)}`, { credentials: "include" });
      if (!res.ok) {
        console.error("native auth exchange failed:", {
          status: res.status,
          body: await res.text(),
        });
        return;
      }
      const data = await res.json();
      if (data.username) {
        localStorage.setItem("isXConnected", "true");
        localStorage.setItem("connectedXId", data.username);
        localStorage.setItem("connectedXUserId", data.xUserId || "");
        localStorage.setItem("twitterId", data.username);
        window.location.replace(`/u/${data.username}`);
      }
    }

    CapApp.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) handleNativeAuthUrl(launch.url, "launch");
      })
      .catch((error) => {
        console.error("native launch url read failed:", error);
      });

    const handle = CapApp.addListener("appUrlOpen", async ({ url }) => {
      await handleNativeAuthUrl(url, "event");
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);


  useEffect(() => {
    function handleWindowScroll() {
      if (mobileTab === "profile") {
        handleProfileScroll();
      } else if (mobileTab === "archive") {
        handleArchiveScroll();
      } else {
        handleChatScroll();
      }
    }

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [mobileTab, chatScrollKey, profileScrollKey, archiveScrollKey]);

  useEffect(() => {
    if (mobileTab === "chat") {
      setChatScrollPos(savedScroll.current);
    } else if (mobileTab === "profile") {
      setProfileScrollPos(savedProfileScroll.current);
    } else if (mobileTab === "archive") {
      setArchiveScrollPos(savedArchiveScroll.current);
    }
  }, [mobileTab]);

  useEffect(() => {
    if (activeQuestionCards.length === 0) return;
    if (restoredScrollFor.current === chatScrollKey) return;
    restoredScrollFor.current = chatScrollKey;

    const saved = sessionStorage.getItem(chatScrollKey);
    if (saved === null) return;

    const value = parseInt(saved, 10);
    savedScroll.current = value;

    // 이미지가 로드되며 콘텐츠 높이가 늘어나는 동안 목표 위치로 계속 보정
    let cancelled = false;
    let frame;
    const start = performance.now();

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };

    const tryRestore = () => {
      if (cancelled) return;
      setChatScrollPos(value);
      if (performance.now() - start < 2000) {
        frame = requestAnimationFrame(tryRestore);
      } else {
        stop();
      }
    };

    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    frame = requestAnimationFrame(tryRestore);

    return stop;
  }, [activeQuestionCards, chatScrollKey]);

  useEffect(() => {
    if (!nickname) return;
    if (restoredProfileScrollFor.current === profileScrollKey) return;
    restoredProfileScrollFor.current = profileScrollKey;

    const saved = sessionStorage.getItem(profileScrollKey);
    if (saved === null) return;

    const value = parseInt(saved, 10);
    savedProfileScroll.current = value;

    let cancelled = false;
    let frame;
    const start = performance.now();

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };

    const tryRestore = () => {
      if (cancelled) return;
      setProfileScrollPos(value);
      if (performance.now() - start < 2000) {
        frame = requestAnimationFrame(tryRestore);
      } else {
        stop();
      }
    };

    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    frame = requestAnimationFrame(tryRestore);

    return stop;
  }, [nickname, profileScrollKey]);

  useEffect(() => {
    if (archivePosts.length === 0) return;
    if (restoredArchiveScrollFor.current === archiveScrollKey) return;
    restoredArchiveScrollFor.current = archiveScrollKey;

    const saved = sessionStorage.getItem(archiveScrollKey);
    if (saved === null) return;

    const value = parseInt(saved, 10);
    savedArchiveScroll.current = value;

    let cancelled = false;
    let frame;
    const start = performance.now();

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
    };

    const tryRestore = () => {
      if (cancelled) return;
      setArchiveScrollPos(value);
      if (performance.now() - start < 2000) {
        frame = requestAnimationFrame(tryRestore);
      } else {
        stop();
      }
    };

    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    frame = requestAnimationFrame(tryRestore);

    return stop;
  }, [archivePosts, archiveScrollKey]);


  useEffect(() => {
    localStorage.setItem(
      "notificationSettings",
      JSON.stringify(notificationSettings)
    );
  }, [notificationSettings]);


  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadArchiveHashtags();
  }, [loadArchiveHashtags]);




  useEffect(() => {
    if (!routeUsername) return;

    fetch(`/api/users/${routeUsername}`)
      .then((res) => res.json())
      .then((data) => {
        setNickname(data.displayName || data.username || "이름없음");
        setProfileBio(data.bio || "");
        setProfileImage(data.avatarUrl || "");
        setBgUrl(data.bgUrl || "");
        setTheme(data.theme || "purple");
        setProfileXUserId(data.xUserId || "");

        localStorage.setItem("editNickname", data.displayName || "");
        localStorage.setItem("bio", data.bio || "");
        localStorage.setItem("profileImage", data.avatarUrl || "");
        localStorage.setItem("bgUrl", data.bgUrl || "");
      })
      .catch((err) => console.error("user fetch error:", err));
  }, [routeUsername]);



  useEffect(() => {
    if (!routeUsername) return;

    loadQuestionsByUsername(routeUsername).catch((err) =>
      console.error("questions fetch error:", err)
    );
  }, [routeUsername]);

  // 다른 유저로 이동하면 초기 스크롤 위치를 다시 잡도록 플래그 리셋
  useEffect(() => {
    didInitialScroll.current = false;
  }, [routeUsername]);

  // 초기 진입 시 첫 대화(맨 위)가 아니라 최근 질문/답변(맨 아래)이 보이도록 한 번만 스크롤
  useEffect(() => {
    if (didInitialScroll.current) return;
    if (!routeUsername) return;
    if (activeQuestionCards.length === 0) return;

    requestAnimationFrame(() => {
      const el = chatScrollRef.current;
      if (el && el.scrollHeight > el.clientHeight) {
        // 데스크톱: chat-panel 자체가 스크롤 컨테이너
        el.scrollTop = el.scrollHeight;
      } else {
        // 모바일: 페이지(window)가 스크롤됨
        window.scrollTo(0, document.documentElement.scrollHeight);
      }
      didInitialScroll.current = true;
    });
  }, [routeUsername, activeQuestionCards.length]);

  useEffect(() => {
    if (!routeUsername) return;

    const raw = localStorage.getItem(questionDraftKey);
    if (!raw) return;

    queueMicrotask(() => {
      try {
        const parsed = JSON.parse(raw);
        setInput(parsed.input || "");
        setSecret(!!parsed.secret);
      } catch (error) {
        console.error("question draft parse error:", error);
      }
    });
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
        const clamped = Math.max(1, Math.min(next, 4));

        if (clamped <= 1) {
          setPanX(0);
          setPanY(0);
        }

        return clamped;
      });
    }

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
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

  useEffect(() => {
    if (!routeUsername) return;
    const channel = supabase
      .channel(`questions-${routeUsername}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "questions" },
        (payload) => {
          loadQuestionsByUsername(routeUsername);
          const newText = payload?.new?.text;
          if (newText) {
            const preview = newText.length > 30 ? newText.slice(0, 30) + "..." : newText;
            showToast(`새 질문: ${preview}`)
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [routeUsername]);

  useEffect(() => {
    if (!routeUsername) return;
    const id = setInterval(() => {
      if (!document.hidden) loadQuestionsByUsername(routeUsername);
    }, 12000);
    return () => clearInterval(id);
  }, [routeUsername]);

  useEffect(() => {
    initNativePushListeners();
  }, []);


  if (!routeUsername) {
    const savedX = localStorage.getItem("connectedXId");
    if (savedX) {
      window.location.replace(`/u/${savedX}`);
      return null;
    }
    return <LandingPage />;
  }

  return (
    <>
      <div className={`app mobile-tab-${mobileTab}`}>
        <div className={`app theme-${theme}`}
          style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : {}}>
              {toast && (
    <div className="toast">
      <span className="toast__icon">💬</span>
      <span className="toast__text">{toast.text}</span>
    </div>
  )}
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

            <button
              type="button"
              className={`top-nav-btn left ${mobileTab === "profile" ? "active" : ""}`}
              onClick={() => setMobileTab("profile")}>
              Profile
            </button>

            <h1 onClick={() => setMobileTab("chat")}>Ask me</h1>

            <svg className="top-bar-wave right" viewBox="0 0 120 24" preserveAspectRatio="none">
              <path d="M0,12 C20,0 40,24 60,12 C80,0 100,24 120,12"
                fill="none" stroke="rgba(130,80,180,0.45)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>

            <button
              type="button"
              className={`top-nav-btn right ${mobileTab === "archive" ? "active" : ""}`}
              onClick={() => setMobileTab("archive")}>
              Archive
            </button>

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

          </header>

          <div className="app-shell">
            <aside
              className={`profile-panel ${mobileTab === "profile" ? "is-mobile-active" : ""}`}
              ref={profileScrollRef}
              onScroll={handleProfileScroll}
            >
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
                theme={theme}
                setTheme={setTheme}
                notificationSettings={notificationSettings}
                setNotificationSettings={setNotificationSettings}
              />
            </aside>



            <main
              className={`chat-panel ${viewMode}-view ${mobileTab === "chat" ? "is-mobile-active" : ""}`}
              ref={chatScrollRef}
              onScroll={handleChatScroll}
            >

              <section className={`card-list ${viewMode}-view`}>
                {activeQuestionCards.length === 0 ? (
                  <p>질문이 없음</p>
                ) : (

                  activeQuestionCards.map((card) => {

                    const hasAnswer = !!card.answer ||
                      (Array.isArray(card.answerFiles) && card.answerFiles.length > 0);
                    const canDeleteQuestion = viewMode === "owner" || card.isMine;

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
                          <article className={`answer-card-only ${justEditedAnswerId === card.id ? "just-edited" : ""}`}>
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
                      className="image-zoom-modal-content"
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

            </main>

            <aside
              className={`archive-panel ${mobileTab === "archive" ? "is-mobile-active" : ""}`}
              ref={archiveScrollRef}
              onScroll={handleArchiveScroll}
            >
              <ArchiveGallery
                posts={archivePosts}
                source={archiveSource}
                viewMode={viewMode}
                isArchiveEditing={isArchiveEditing}
                onToggleEdit={handleToggleArchiveEdit}
                onSyncArchive={syncArchive}
                onToggleVisibility={toggleArchivePostVisibility}
                onToggleCollapsed={toggleArchivePostCollapsed} />
            </aside>
          </div>
        </div>
      </div>

    </>
  );
}



export default App;
