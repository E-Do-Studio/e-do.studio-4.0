-- Revert 20260602120000_chat_sessions.sql.
--
-- The conversation-export feature (Sens B) was dropped: we no longer persist
-- chat transcripts. The second brain (LLM wiki) is fed only by curated pages,
-- and feeds the chatbot back its knowledge AND instructions — not the reverse.

drop function if exists purge_expired_chat_sessions();
drop table if exists chat_sessions;
