"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Download,
  FileText,
  RotateCcw,
  EllipsisVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ChatSessionMeta } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

interface ConversationListProps {
  chats: ChatSessionMeta[];
  activeChatId: string | null;
  onSelect: (chat: ChatSessionMeta) => void;
  onRename: (chatId: string, newTitle: string) => void;
  onPin: (chatId: string, pinned: boolean) => void;
  onDelete: (chatId: string) => void;
  onReset: (chatId: string) => void;
  onExport: (chatId: string) => void;
}

export function ConversationList({
  chats,
  activeChatId,
  onSelect,
  onRename,
  onPin,
  onDelete,
  onReset,
  onExport,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const t = useTranslation();

  useEffect(() => {
    if (editingId) {
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [editingId]);

  const startRename = (chat: ChatSessionMeta) => {
    setEditingId(chat.id);
    setEditValue(chat.title);
  };

  const confirmRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-white/40">
        <MessageSquare className="h-8 w-8" />
        <p className="text-sm">{t("noConversation")}</p>
      </div>
    );
  }

  const pinned = chats.filter((c) => c.pinned);
  const unpinned = chats.filter((c) => !c.pinned);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-0.5 p-2">
        {pinned.length > 0 && (
          <>
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t("pinnedChats")}
            </p>
            {pinned.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                active={activeChatId === chat.id}
                editing={editingId === chat.id}
                editValue={editValue}
                editRef={editRef}
                onEditChange={setEditValue}
                onEditConfirm={confirmRename}
                onEditCancel={() => setEditingId(null)}
                onSelect={onSelect}
                onStartRename={startRename}
                onPin={onPin}
                onDelete={onDelete}
                onReset={onReset}
                onExport={onExport}
              />
            ))}
          </>
        )}
        {unpinned.length > 0 && pinned.length > 0 && (
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {t("recentChats")}
          </p>
        )}
        {unpinned.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            active={activeChatId === chat.id}
            editing={editingId === chat.id}
            editValue={editValue}
            editRef={editRef}
            onEditChange={setEditValue}
            onEditConfirm={confirmRename}
            onEditCancel={() => setEditingId(null)}
            onSelect={onSelect}
            onStartRename={startRename}
            onPin={onPin}
            onDelete={onDelete}
            onReset={onReset}
            onExport={onExport}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface ChatItemProps {
  chat: ChatSessionMeta;
  active: boolean;
  editing: boolean;
  editValue: string;
  editRef: React.RefObject<HTMLInputElement | null>;
  onEditChange: (val: string) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onSelect: (chat: ChatSessionMeta) => void;
  onStartRename: (chat: ChatSessionMeta) => void;
  onPin: (chatId: string, pinned: boolean) => void;
  onDelete: (chatId: string) => void;
  onReset: (chatId: string) => void;
  onExport: (chatId: string) => void;
}

function MenuItems({
  chat,
  onStartRename,
  onPin,
  onDelete,
  onReset,
  onExport,
}: {
  chat: ChatSessionMeta;
  onStartRename: (chat: ChatSessionMeta) => void;
  onPin: (chatId: string, pinned: boolean) => void;
  onDelete: (chatId: string) => void;
  onReset: (chatId: string) => void;
  onExport: (chatId: string) => void;
}) {
  const t = useTranslation();

  return (
    <>
      <ContextMenuItem onClick={() => onStartRename(chat)}>
        <Pencil className="mr-2 h-4 w-4" />
        {t("renameChat")}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onPin(chat.id, !chat.pinned)}>
        {chat.pinned ? (
          <>
            <PinOff className="mr-2 h-4 w-4" />
            {t("unpinChat")}
          </>
        ) : (
          <>
            <Pin className="mr-2 h-4 w-4" />
            {t("pinChat")}
          </>
        )}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onExport(chat.id)}>
        <Download className="mr-2 h-4 w-4" />
        {t("exportChat")}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onReset(chat.id)}>
        <RotateCcw className="mr-2 h-4 w-4" />
        {t("resetChat")}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        variant="destructive"
        onClick={() => onDelete(chat.id)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {t("deleteChatBtn")}
      </ContextMenuItem>
    </>
  );
}

function ChatItem({
  chat,
  active,
  editing,
  editValue,
  editRef,
  onEditChange,
  onEditConfirm,
  onEditCancel,
  onSelect,
  onStartRename,
  onPin,
  onDelete,
  onReset,
  onExport,
}: ChatItemProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  const openContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = triggerRef.current;
    if (!el) return;
    el.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: e.clientX,
        clientY: e.clientY,
      }),
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger ref={triggerRef}>
        <div
          className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
            }`}
          onClick={() => !editing && onSelect(chat)}
        >
          <FileText className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.5} />
          {chat.pinned && !active && (
            <Pin className="h-3 w-3 shrink-0 text-white/40" />
          )}

          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                ref={editRef}
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onEditConfirm();
                  if (e.key === "Escape") onEditCancel();
                }}
                onBlur={onEditConfirm}
                className="h-6 text-sm px-1 py-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <p className="truncate font-normal text-xs text-white/80">{chat.title}</p>
                <p
                  className={`text-[11px] truncate mt-0.5 ${active
                    ? "text-white/60"
                    : "text-white/30"
                    }`}
                >
                  {chat.document_filename}
                </p>
              </>
            )}
          </div>

          {!editing && (
            <button
              type="button"
              className={`h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${active
                ? "text-white hover:bg-white/20"
                : "text-white/50 hover:bg-white/10"
                }`}
              onClick={openContextMenu}
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <MenuItems
          chat={chat}
          onStartRename={onStartRename}
          onPin={onPin}
          onDelete={onDelete}
          onReset={onReset}
          onExport={onExport}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}
