import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import {
  askAiSeoExpert,
  getProjectAiHistory,
  saveProjectAiHistory,
  AiConsultationMessage,
  recordLearnedInsight,
} from '../lib/aiSeoAgent';
import { ProjectData } from './EditProjectModal';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Maximize2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Bot,
  Zap,
} from 'lucide-react';

interface ProactiveAiAssistantProps {
  activeProject: ProjectData | null;
  issues?: any[];
  onOpenAdvisor: () => void;
  onOpenIssues: () => void;
}

export const ProactiveAiAssistant: React.FC<ProactiveAiAssistantProps> = ({
  activeProject,
  issues = [],
  onOpenAdvisor,
  onOpenIssues,
}) => {
  const { t, locale } = useI18n();
  const isAr = locale !== 'en';

  const projectId = activeProject?.id || 'default-project';
  const projectDomain = activeProject?.domain || 'your-website.com';
  const projectHealth = activeProject?.health_score || 80;

  const [isOpen, setIsOpen] = useState(false);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [bubbleContent, setBubbleContent] = useState<{
    headline: string;
    description: string;
    ctaLabel: string;
    target: 'advisor' | 'issues';
  }>({
    headline: '',
    description: '',
    ctaLabel: '',
    target: 'advisor',
  });

  const [messages, setMessages] = useState<AiConsultationMessage[]>(() =>
    getProjectAiHistory(projectId, isAr)
  );
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync messages when active project changes
  useEffect(() => {
    setMessages(getProjectAiHistory(projectId, isAr));
  }, [projectId, isAr]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isThinking]);

  // Compute live project diagnostic stats
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  // Build tailored proactive suggestions
  const generateProactiveTip = () => {
    if (criticalCount > 0) {
      return {
        headline: isAr ? 'رصدت مشاكل حرجة تؤثر على الفهرسة!' : 'Critical Indexing Issues Detected!',
        description: isAr
          ? `فحصت موقعك (${projectDomain}) ورصدت ${criticalCount} مشكلة حرجة بحاجة إلى حل فوري لحماية ميزانية الزحف والترتيب.`
          : `I audited (${projectDomain}) and found ${criticalCount} critical issues that require immediate resolution to protect crawl budget.`,
        ctaLabel: isAr ? 'ابدأ في تحسين موقعك الآن' : 'Start Improving Site Now',
        target: 'issues' as const,
      };
    } else if (warningCount > 0 || projectHealth < 90) {
      return {
        headline: isAr ? 'فرص لرفع صحة الموقع إلى 95%+' : 'Boost Health Score to 95%+',
        description: isAr
          ? `موقعك (${projectDomain}) لديه ${warningCount} فرصة لتسريع الأداء وتحسين الوسوم. دعني أساعدك في إنجازها خطوة بخطوة.`
          : `Your site (${projectDomain}) has ${warningCount} high-leverage opportunities to optimize speed and tags. Let us resolve them.`,
        ctaLabel: isAr ? 'ابدأ في تحسين موقعك الآن' : 'Start Improving Site Now',
        target: 'advisor' as const,
      };
    } else {
      return {
        headline: isAr ? 'مستشارك الذكي جاهز للاستشارة' : 'Your SEO Expert is Ready',
        description: isAr
          ? `صحة موقعك (${projectDomain}) ممتازة (${projectHealth}%). اسألني: "الموقع محتاج ايه؟" لتحصل على خطة لتدعيم سلطة المحتوى والـ E-E-A-T.`
          : `Site health for (${projectDomain}) is solid (${projectHealth}%). Ask me: "What does my site need?" for advanced topical authority steps.`,
        ctaLabel: isAr ? 'ابدأ الاستشارة المباشرة' : 'Start Consultation',
        target: 'advisor' as const,
      };
    }
  };

  // Initial proactive trigger (4 seconds after load or site change)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && dismissCount < 3) {
        setBubbleContent(generateProactiveTip());
        setIsBubbleVisible(true);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [projectId, criticalCount, warningCount, projectHealth, dismissCount]);

  // Periodic proactive check every 2.5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen && dismissCount < 4) {
        setBubbleContent(generateProactiveTip());
        setIsBubbleVisible(true);
      }
    }, 150000);

    return () => clearInterval(interval);
  }, [isOpen, dismissCount, projectId, criticalCount, warningCount]);

  const handleDismissBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBubbleVisible(false);
    setDismissCount((prev) => prev + 1);
  };

  const handleBubbleAction = () => {
    setIsBubbleVisible(false);
    if (bubbleContent.target === 'issues') {
      onOpenIssues();
    } else {
      setIsOpen(true);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isThinking) return;

    setInputText('');

    const userMsg: AiConsultationMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    saveProjectAiHistory(projectId, updatedWithUser);

    setIsThinking(true);

    try {
      await new Promise((r) => setTimeout(r, 550));

      const aiReply = await askAiSeoExpert({
        prompt: textToSend,
        projectId,
        projectDomain,
        projectRootUrl: activeProject?.root_url,
        healthScore: projectHealth,
        issues,
        isAr,
      });

      const updatedWithAi = [...updatedWithUser, aiReply];
      setMessages(updatedWithAi);
      saveProjectAiHistory(projectId, updatedWithAi);

      // Record learned insight so AI continually self-learns
      recordLearnedInsight(projectDomain, textToSend);
    } catch (err) {
      console.warn('AI Assistant error:', err);
    } finally {
      setIsThinking(false);
    }
  };

  const quickPrompts = isAr
    ? [
        'الموقع محتاج اه؟',
        'كيف أصلح أخطاء الـ 404؟',
        'تسريع الموقع والـ Core Web Vitals',
        'تحسين الروابط الداخلية والسكيما',
      ]
    : [
        'What does my site need?',
        'How to resolve 404 crawl errors?',
        'Accelerate Core Web Vitals',
        'Internal links & Schema markup',
      ];

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="fixed bottom-6 end-6 z-40 flex flex-col items-end pointer-events-none">
      {/* Proactive Floating Suggestion Bubble */}
      {isBubbleVisible && !isOpen && (
        <div className="pointer-events-auto mb-3 max-w-sm w-[340px] sm:w-[380px] bg-white rounded-2xl p-4 shadow-2xl border border-gold-border animate-bounce-subtle text-ink">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold-tint text-gold border border-gold-border flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-gold uppercase tracking-wider">
                  {isAr ? 'مستشار الـ SEO الذكي' : 'AI SEO Advisor'}
                </span>
                <h4 className="text-sm font-bold text-ink leading-snug">
                  {bubbleContent.headline}
                </h4>
              </div>
            </div>
            <button
              onClick={handleDismissBubble}
              className="text-ink-muted hover:text-ink p-1 rounded-md hover:bg-surface-soft transition-colors"
              title={isAr ? 'إغلاق التنبيه' : 'Dismiss'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-ink-muted mt-2 leading-relaxed">
            {bubbleContent.description}
          </p>

          <div className="mt-3 pt-2 border-t border-surface-hairline flex items-center justify-between gap-2">
            <button
              onClick={handleBubbleAction}
              className="flex-1 py-2 px-3 rounded-xl bg-gold hover:bg-gold-hover text-white text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
            >
              <span>{bubbleContent.ctaLabel}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsBubbleVisible(false);
                setIsOpen(true);
              }}
              className="py-2 px-3 rounded-xl border border-gold-border bg-gold-tint text-gold hover:bg-gold-tint/80 text-xs font-bold transition-colors"
            >
              {isAr ? 'محادثة سريعة' : 'Quick Chat'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Mini Chat Popover Drawer */}
      {isOpen && (
        <div className="pointer-events-auto mb-3 w-[360px] sm:w-[420px] h-[520px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gold-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-gold-tint via-white to-gold-tint/50 border-b border-gold-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gold text-white flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-ink">
                    {isAr ? 'خبير الـ SEO الذكي' : 'AI SEO Architect'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-[11px] text-ink-muted">
                  {projectDomain} • {projectHealth}% {isAr ? 'صحة' : 'Health'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenAdvisor();
                }}
                className="p-1.5 rounded-lg text-ink-muted hover:text-gold hover:bg-gold-tint transition-colors"
                title={isAr ? 'فتح في شاشة كاملة' : 'Maximize to Full Page'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-surface-soft/60 border-b border-surface-hairline overflow-x-auto flex gap-1.5 scrollbar-thin shrink-0">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isThinking}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-gold-tint border border-gold-border/70 text-[11px] font-medium text-ink hover:text-gold transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface/30">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="w-12 h-12 rounded-2xl bg-gold-tint border border-gold-border text-gold mx-auto flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-ink">
                  {isAr ? 'كيف أساعدك في تطوير موقعك؟' : 'How can I assist your SEO?'}
                </h5>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  {isAr
                    ? 'اسألني عن مشاكل الروابط، الأرشفة، السكيما، أو اكتب: "الموقع محتاج ايه؟"'
                    : 'Ask about 404 errors, indexing, schema, or ask: "What does my site need?"'}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 text-xs ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gold text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gold text-white font-medium rounded-ee-sm'
                      : 'bg-white border border-surface-hairline text-ink rounded-es-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                  {msg.docCitationUrl && (
                    <div className="mt-2 pt-2 border-t border-surface-hairline text-[10px] text-ink-muted">
                      <a
                        href={msg.docCitationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>{msg.docCitationTitle || 'Google Search Central'}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-2.5 items-center text-xs text-ink-muted">
                <div className="w-7 h-7 rounded-lg bg-gold-tint border border-gold-border text-gold flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-surface-hairline rounded-2xl px-3 py-2 flex items-center gap-1.5">
                  <span className="text-[11px] text-ink-muted font-medium">
                    {isAr ? 'جاري التحليل ومطابقة معايير جوجل...' : 'Analyzing Google standards...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-surface-hairline shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isAr
                    ? 'اسأل خبير الـ SEO (مثال: الموقع محتاج ايه؟)...'
                    : 'Ask SEO Expert (e.g. What does my site need?)...'
                }
                disabled={isThinking}
                className="flex-1 bg-surface-soft border border-surface-hairline focus:border-gold focus:ring-2 focus:ring-gold/20 rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-subtle outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isThinking}
                className="w-8 h-8 rounded-xl bg-gold hover:bg-gold-hover disabled:bg-surface-hairline text-white flex items-center justify-center transition-colors shrink-0 shadow-sm"
              >
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Master Button */}
      <button
        onClick={() => {
          setIsBubbleVisible(false);
          setIsOpen((prev) => !prev);
        }}
        className="pointer-events-auto group relative w-14 h-14 rounded-full bg-gold hover:bg-gold-hover text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center active:scale-95 focus:outline-none focus:ring-4 focus:ring-gold/30"
        title={isAr ? 'مستشار السيو الذكي' : 'AI SEO Advisor'}
      >
        <span className="absolute -top-1 -end-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white" />
        </span>

        {isOpen ? (
          <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
        ) : (
          <Sparkles className="w-6 h-6 transition-transform group-hover:scale-110 duration-200" />
        )}
      </button>
    </div>
  );
};
