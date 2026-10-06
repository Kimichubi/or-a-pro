package store

import "errors"

var (
	ErrNotFound       = errors.New("not found")
	ErrEmailTaken     = errors.New("email already registered")
	ErrAlreadyDecided = errors.New("quote already decided")
)
