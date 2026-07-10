"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Anchor, Archive, Award, BarChart2, Battery, Bell, Book,
  BookOpen, Brain, Briefcase, Camera, Car, Check, Circle, Clipboard,
  Clock, Cloud, Code, Coffee, Compass, CreditCard, Dumbbell,
  Edit3, Eye, Feather, FileText, Film, Flame, Folder, Globe,
  GraduationCap, Grid, Hammer, Heart, Home, Image, Inbox,
  Landmark, Laptop, Layers, Leaf, Lightbulb, Link, List, Lock,
  Map, MessageCircle, Mic, Monitor, Moon, Music, Package, Palette,
  PenLine, Plane, PlayCircle, Puzzle, Radio, RefreshCw, Rocket,
  Settings, ShoppingCart, Smile, Sparkles, Star, Sun, Tag,
  Target, Terminal, Tv, Umbrella, Users, Video, Wallet, Wifi, Zap,
  BookMarked, ChefHat, Bike, Bus, Baby, Apple, Flower2, FlameKindling,
  Gamepad2, Guitar, Headphones, Microscope, Mountain, PiggyBank,
  Scissors, ShieldCheck, Stethoscope, Swords, Tent, TreePine,
  Trophy, Truck, Wrench, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_LIST = [
  // Work & Productivity
  [Briefcase, "Briefcase", "Work"],
  [Laptop, "Laptop", "Work"],
  [Monitor, "Monitor", "Work"],
  [Code, "Code", "Work"],
  [Terminal, "Terminal", "Work"],
  [FileText, "FileText", "Work"],
  [Clipboard, "Clipboard", "Work"],
  [PenLine, "PenLine", "Work"],
  [Edit3, "Edit", "Work"],
  [Archive, "Archive", "Work"],
  [Inbox, "Inbox", "Work"],
  [Folder, "Folder", "Work"],
  [Layers, "Layers", "Work"],
  [Grid, "Grid", "Work"],
  [Settings, "Settings", "Work"],
  [Hammer, "Hammer", "Work"],
  [Wrench, "Wrench", "Work"],
  [ShieldCheck, "ShieldCheck", "Work"],
  [Lock, "Lock", "Work"],
  [Link, "Link", "Work"],

  // Learning & Mind
  [Book, "Book", "Learning"],
  [BookOpen, "BookOpen", "Learning"],
  [BookMarked, "BookMarked", "Learning"],
  [Brain, "Brain", "Learning"],
  [GraduationCap, "GraduationCap", "Learning"],
  [Lightbulb, "Lightbulb", "Learning"],
  [Microscope, "Microscope", "Learning"],
  [Puzzle, "Puzzle", "Learning"],
  [Target, "Target", "Learning"],
  [Compass, "Compass", "Learning"],
  [Award, "Award", "Learning"],
  [Trophy, "Trophy", "Learning"],

  // Health & Life
  [Heart, "Heart", "Life"],
  [Dumbbell, "Dumbbell", "Life"],
  [Stethoscope, "Stethoscope", "Life"],
  [Apple, "Apple", "Life"],
  [Leaf, "Leaf", "Life"],
  [Moon, "Moon", "Life"],
  [Sun, "Sun", "Life"],
  [Umbrella, "Umbrella", "Life"],
  [Coffee, "Coffee", "Life"],
  [Smile, "Smile", "Life"],
  [Baby, "Baby", "Life"],
  [Flower2, "Flower", "Life"],
  [TreePine, "TreePine", "Life"],
  [Mountain, "Mountain", "Life"],
  [Tent, "Tent", "Life"],
  [Bike, "Bike", "Life"],

  // Finance & Shopping
  [Wallet, "Wallet", "Finance"],
  [CreditCard, "CreditCard", "Finance"],
  [PiggyBank, "PiggyBank", "Finance"],
  [BarChart2, "BarChart", "Finance"],
  [ShoppingCart, "ShoppingCart", "Finance"],
  [Package, "Package", "Finance"],
  [Tag, "Tag", "Finance"],
  [Landmark, "Landmark", "Finance"],

  // Creative & Media
  [Camera, "Camera", "Creative"],
  [Music, "Music", "Creative"],
  [Headphones, "Headphones", "Creative"],
  [Guitar, "Guitar", "Creative"],
  [Gamepad2, "Gamepad", "Creative"],
  [Film, "Film", "Creative"],
  [Video, "Video", "Creative"],
  [Palette, "Palette", "Creative"],
  [Mic, "Mic", "Creative"],
  [Radio, "Radio", "Creative"],
  [Tv, "Tv", "Creative"],
  [Image, "Image", "Creative"],
  [Feather, "Feather", "Creative"],

  // Other / Misc
  [Home, "Home", "Other"],
  [Users, "Users", "Other"],
  [MessageCircle, "Message", "Other"],
  [Bell, "Bell", "Other"],
  [Globe, "Globe", "Other"],
  [Plane, "Plane", "Other"],
  [Car, "Car", "Other"],
  [Bus, "Bus", "Other"],
  [Truck, "Truck", "Other"],
  [Rocket, "Rocket", "Other"],
  [Star, "Star", "Other"],
  [Sparkles, "Sparkles", "Other"],
  [Flame, "Flame", "Other"],
  [FlameKindling, "Kindling", "Other"],
  [Zap, "Zap", "Other"],
  [Cloud, "Cloud", "Other"],
  [Wifi, "Wifi", "Other"],
  [Battery, "Battery", "Other"],
  [Activity, "Activity", "Other"],
  [Anchor, "Anchor", "Other"],
  [Map, "Map", "Other"],
  [List, "List", "Other"],
  [Eye, "Eye", "Other"],
  [RefreshCw, "Refresh", "Other"],
  [PlayCircle, "Play", "Other"],
  [Scissors, "Scissors", "Other"],
  [Swords, "Swords", "Other"],
  [Clock, "Clock", "Other"],
  [ChefHat, "ChefHat", "Other"],
] as const;

type IconEntry = (typeof ICON_LIST)[number];
const GROUPS = ["All", "Work", "Learning", "Life", "Finance", "Creative", "Other"] as const;
type Group = (typeof GROUPS)[number];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  accentBg?: string;
  accentText?: string;
}

export function IconPicker({
  value,
  onChange,
  accentBg = "bg-violet-100",
  accentText = "text-violet-700",
}: IconPickerProps) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<Group>("All");
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (ICON_LIST as readonly IconEntry[]).filter((entry) => {
      const nameMatch = entry[1].toLowerCase().includes(q);
      const groupMatch = group === "All" || entry[2] === group;
      return nameMatch && groupMatch;
    });
  }, [search, group]);

  useEffect(() => {
    setFocusIndex(-1);
  }, [search, group]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const cols = 6;
      const len = filtered.length;
      if (len === 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusIndex((i) => (i + 1) % len);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusIndex((i) => (i - 1 + len) % len);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + cols, len - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - cols, 0));
      } else if (e.key === "Enter" && focusIndex >= 0) {
        e.preventDefault();
        onChange(filtered[focusIndex][1]);
      } else if (e.key === "Escape") {
        searchRef.current?.blur();
      }
    },
    [filtered, focusIndex, onChange],
  );

  useEffect(() => {
    if (focusIndex < 0 || !gridRef.current) return;
    const btn = gridRef.current.querySelectorAll<HTMLButtonElement>("button")[focusIndex];
    btn?.scrollIntoView({ block: "nearest" });
  }, [focusIndex]);

  return (
    <div className="flex flex-col gap-2" onKeyDown={handleKeyDown}>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search icons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-xs placeholder:text-zinc-400 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-violet-700 dark:focus:ring-violet-900/30 transition"
          aria-label="Search icons"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition",
              group === g
                ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 dark:text-zinc-400",
            )}
            aria-pressed={group === g}
          >
            {g}
          </button>
        ))}
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-6 gap-1 max-h-[180px] overflow-y-auto pr-0.5 rounded-md"
        role="listbox"
        aria-label="Icon grid"
      >
        {filtered.length === 0 && (
          <p className="col-span-6 py-6 text-center text-xs text-zinc-400">No icons match "{search}"</p>
        )}
        {filtered.map(([Icon, name], idx) => {
          const isSelected = value === name;
          const isFocused = focusIndex === idx;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              onMouseEnter={() => setFocusIndex(idx)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border transition-all",
                isSelected
                  ? `${accentBg} ${accentText} border-current/30 ring-2 ring-current/20 scale-105`
                  : isFocused
                    ? "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    : "border-transparent text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-900",
              )}
              aria-selected={isSelected}
              aria-label={name}
              role="option"
              tabIndex={-1}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}
      </div>

      {value && (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
          Selected: <span className="font-medium text-zinc-600 dark:text-zinc-300">{value}</span>
        </p>
      )}
    </div>
  );
}
