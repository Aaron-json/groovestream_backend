package controllers

import "sync"

type BufPool struct {
	pool *sync.Pool
}

const (
	default_buf_cap = 1024 * 1024
)

var (
	bufPool = BufPool{
		pool: &sync.Pool{
			New: func() any {
				return make([]byte, 0, default_buf_cap)
			},
		},
	}
)

// Returns an arbitrary buffer with initial capacity preallocated and a length of 0.
// Buffer is not neccessarily zeroed.
func (bp BufPool) Get() []byte {
	buf := bp.pool.Get().([]byte)
	return buf
}

func (bp BufPool) Put(buf []byte) {
	// New content will override past values
	buf = buf[:0]
	bp.pool.Put(buf)
}
