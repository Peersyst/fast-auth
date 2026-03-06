package logger

import (
	"log/slog"
	"os"
	"strings"
)

var l *slog.Logger

func Init() {
	l = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: parseLevel(os.Getenv("LOG_LEVEL")),
	}))
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func Info(msg string, args ...any) {
	l.Info(msg, args...)
}

func Warn(msg string, args ...any) {
	l.Warn(msg, args...)
}

func Error(msg string, args ...any) {
	l.Error(msg, args...)
}
