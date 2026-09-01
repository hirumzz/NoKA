package handlers

import (
	"fmt"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
)

var serverStartTime = time.Now()

type SystemResourcesResponse struct {
	UptimeSeconds   int64   `json:"uptime_seconds"`
	UptimeFormatted string  `json:"uptime_formatted"`
	NumCPU          int     `json:"num_cpu"`
	NumGoroutine    int     `json:"num_goroutines"`
	MemoryAllocMB   float64 `json:"memory_alloc_mb"`
	MemorySysMB     float64 `json:"memory_sys_mb"`
	HeapAllocMB     float64 `json:"heap_alloc_mb"`
	NumGC           uint32  `json:"num_gc"`
	Hostname        string  `json:"hostname"`
	GoVersion       string  `json:"go_version"`
	EstimatedCPU    float64 `json:"estimated_cpu_percent"`
}

// GetSystemResources returns NOKA app container performance and runtime memory stats
func GetSystemResources(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	uptime := time.Since(serverStartTime)
	uptimeSecs := int64(uptime.Seconds())

	days := uptimeSecs / 86400
	hours := (uptimeSecs % 86400) / 3600
	minutes := (uptimeSecs % 3600) / 60

	formatted := ""
	if days > 0 {
		formatted = fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	} else if hours > 0 {
		formatted = fmt.Sprintf("%dh %dm", hours, minutes)
	} else {
		formatted = fmt.Sprintf("%dm %ds", minutes, uptimeSecs%60)
	}

	hostname, _ := os.Hostname()

	// Active goroutines
	goroutines := runtime.NumGoroutine()
	cpuEst := float64(goroutines) * 0.12
	if cpuEst > 100.0 {
		cpuEst = 100.0
	}
	if cpuEst < 0.5 {
		cpuEst = 0.8
	}

	c.JSON(http.StatusOK, SystemResourcesResponse{
		UptimeSeconds:   uptimeSecs,
		UptimeFormatted: formatted,
		NumCPU:          runtime.NumCPU(),
		NumGoroutine:    goroutines,
		MemoryAllocMB:   float64(m.Alloc) / 1024 / 1024,
		MemorySysMB:     float64(m.Sys) / 1024 / 1024,
		HeapAllocMB:     float64(m.HeapAlloc) / 1024 / 1024,
		NumGC:           m.NumGC,
		Hostname:        hostname,
		GoVersion:       runtime.Version(),
		EstimatedCPU:    cpuEst,
	})
}
