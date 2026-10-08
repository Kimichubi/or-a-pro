package store

import "errors"

var (
	ErrNotFound        = errors.New("not found")
	ErrEmailTaken      = errors.New("email already registered")
	ErrAlreadyDecided  = errors.New("quote already decided")
	ErrDecisionNotOpen = errors.New("quote is not open for client decision")
	ErrFreePlanLimit   = errors.New("free plan monthly quote limit reached")
)
