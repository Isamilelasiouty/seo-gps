import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import {
  getProjectAiHistory,
  saveProjectAiHistory,
  clearProjectAiHistory,
  askAiSeoExpert,
  AiConsultationMessage,
} from '../lib/aiSeoAgent';
import { ProjectData } from '../components/EditProjectModal';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Cpu,
  ShieldCheck,
  Terminal,
  HelpCircle,
} from 'lucide-react';

interface AiAdvisorPageProps {
  activeProject: ProjectData | null;
  issues?: any[];
}

export const AiAdvisorPage: React.FC<AiAdvisorPageProps> = ({ activeProject, issues = [] }) => {
  const { t, locale, dir } = useI18n();
  const isAr = locale !== 'en';

  const projectId = activeProject?.id || 'default-project';
  const projectDomain = activeProject?.domain || 'example.com';
  const projectHealth = activeProject?.health_score || 85;

  const [messages, setMessages] = useState<AiConsultationMessage[]>(() =>
    getProjectAiHistory(projectId, isAr)
  );
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync when project changes
  useEffect(() => {
    setMessages(getProjectAiHistory(projectId, isAr));
  }, [projectId, isAr]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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
      // Simulate real-time expert inference
      await new Promise((r) => setTimeout(r, 600));

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
    } catch (err) {
      console.warn('AI Advisor query error:', err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClear = () => {
    clearProjectAiHistory(projectId);
    setMessages(getProjectAiHistory(projectId, isAr));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick prompt suggestions tailored for active site
  const quickPrompts = isAr
    ? [
        'ما هي أخطر 3 مشاكل تقنية مكتشفة في موقعي وكيف أحلها وفق معايير جوجل؟',
        'كيف أتعامل مع روابط 404 المكتشفة في الموقع؟',
        'كيف أحسن سرعة الموقع ومؤشرات Core Web Vitals؟',
        'كيف أضبط ملف robots.txt والـ sitemap بشكل معتمد من جوجل؟',
        'ما هي معايير جوجل لتحسين الـ E-E-A-T وجودة المحتوى؟',
      ]
    : [
        'What are the top 3 critical issues on my site and how to fix them per Google standards?',
        'How should I handle broken 404 URLs discovered on my site?',
        'How can I optimize Core Web Vitals and page speed?',
        'How to properly configure robots.txt and sitemap per Google guidelines?',
        'What are Google E-E-A-T guidelines for content quality?',
      ];

  return (
    <div className="space-y-6" dir={dir}>
      {/* 1. Header Card */}
      <div className="editorial-card p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gold-tint border border-gold-border text-gold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{isAr ? 'مستشار السيو الذكي' : 'Technical SEO AI Advisor'}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-tint text-gold border border-gold-border">
                    Google Search Central Architecture
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  {isAr
                    ? `مستشار معتمد بخبرة 60 عاماً، مدرب على كامل توثيق جوجل الرسمي ومطلع على فحص موقع (${projectDomain})`
                    : `Senior Google Search Strategist trained on official docs, reviewing (${projectDomain})`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gold-tint/80 border border-gold-border text-xs font-bold text-gold">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span>{isAr ? 'الذاكرة الذكية نشطة' : 'AI Site Memory Active'}</span>
            </div>

            <button
              onClick={handleClear}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-colors"
              title={isAr ? 'مسح سجل المحادثة' : 'Clear Chat History'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Consultation Chips */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            {isAr ? 'استشارات سريعة مقترحة لموقعك:' : 'Recommended quick consultations for your site:'}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isThinking}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 hover:bg-gold-tint hover:text-gold border border-slate-200/90 hover:border-gold-border transition-all text-slate-700 active:scale-95 disabled:opacity-50 text-start"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Chat Transcript Area */}
      <div className="editorial-card p-6 bg-white border border-slate-200/90 rounded-2xl min-h-[460px] flex flex-col justify-between shadow-xs">
        <div className="space-y-5 overflow-y-auto max-h-[560px] pr-1 pl-1">
          {messages.map((msg) => {
            const isAi = msg.role === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isAi ? 'items-start' : 'items-start justify-end'}`}
              >
                {isAi && (
                  <div className="w-9 h-9 rounded-2xl bg-gold text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                    SEO
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4.5 text-sm leading-relaxed ${
                    isAi
                      ? 'bg-slate-50 border border-slate-200/80 text-slate-800'
                      : 'bg-gold text-white shadow-sm'
                  }`}
                >
                  {/* Content with whitespace formatting */}
                  <div className="whitespace-pre-line font-normal">{msg.content}</div>

                  {/* Code snippet if provided */}
                  {msg.codeSnippet && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 mb-1.5">
                        <span className="uppercase">{msg.codeSnippet.language} Fix</span>
                        <button
                          onClick={() => copyToClipboard(msg.codeSnippet!.code, `code-${msg.id}`)}
                          className="flex items-center gap-1 hover:text-gold"
                        >
                          {copiedId === `code-${msg.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === `code-${msg.id}` ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto leading-normal">
                        <code>{msg.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Google Official Reference Link */}
                  {msg.docCitationUrl && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <a
                        href={msg.docCitationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-gold hover:text-gold-hover font-bold hover:underline"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{msg.docCitationTitle || (isAr ? 'مرجع Google Search Central الرسمي' : 'Official Google Documentation')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        title={isAr ? 'نسخ الرد' : 'Copy response'}
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {!isAi && (
                  <div className="w-9 h-9 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                    {activeProject?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            );
          })}

          {isThinking && (
            <div className="flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-2xl bg-gold text-white flex items-center justify-center shrink-0 animate-pulse text-xs font-bold">
                SEO
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                <span>{isAr ? 'جارٍ تحليل إرشادات جوجل وخطة الإصلاح الفنية...' : 'Analyzing Google Search Central guidelines...'}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. Input Form */}
        <div className="mt-5 pt-4 border-t border-slate-100">
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
                  ? `اسأل خبير الـ SEO عن أي مشكلة في (${projectDomain}) أو استشارة تقنية...`
                  : `Ask the SEO Architect about any issue on (${projectDomain})...`
              }
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
            <button
              type="submit"
              disabled={isThinking || !inputText.trim()}
              className="px-5 py-3 rounded-xl bg-gold hover:bg-gold-hover active:scale-95 text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <span>{isAr ? 'إرسال' : 'Send'}</span>
              <Send className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
