package utils

import (
	"net"
)

// IsPrivateIP checks if a given IP address is considered private or internal.
// This includes loopback, private IPv4/IPv6 blocks, link-local, and multicast addresses.
func IsPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
		return true
	}

	// Check if IP is in a private network block (e.g. 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7)
	return ip.IsPrivate()
}
