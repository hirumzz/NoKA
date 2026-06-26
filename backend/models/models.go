package models

import (
	"time"
)

// User represents the konga_users table
type User struct {
	ID              uint       `gorm:"primaryKey;column:id" json:"id"`
	Username        string     `gorm:"unique;column:username" json:"username"`
	Email           string     `gorm:"unique;column:email" json:"email"`
	Avatar          string     `gorm:"column:avatar" json:"avatar"`
	Role            string     `gorm:"column:role;default:admin" json:"role"` // admin, developer, viewer, commenter
	FirstName       string     `gorm:"column:firstName" json:"firstName"`
	LastName        string     `gorm:"column:lastName" json:"lastName"`
	Admin           bool       `gorm:"column:admin;default:false" json:"admin"`
	NodeID          string     `gorm:"column:node_id" json:"node_id"`
	Active          bool       `gorm:"column:active;default:false" json:"active"`
	ActivationToken string     `gorm:"column:activationToken" json:"activationToken"`
	Node            *uint      `gorm:"column:node" json:"node"`
	CreatedAt       time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt       time.Time  `gorm:"column:updatedAt" json:"updatedAt"`
	CreatedUserID   *uint      `gorm:"column:createdUserId" json:"createdUserId,omitempty"`
	UpdatedUserID   *uint      `gorm:"column:updatedUserId" json:"updatedUserId,omitempty"`
	Passports       []Passport `gorm:"foreignKey:UserID" json:"-"`
}

func (User) TableName() string {
	return "konga_users"
}

// Passport represents the konga_passports table
type Passport struct {
	ID         uint      `gorm:"primaryKey;column:id" json:"id"`
	Protocol   string    `gorm:"column:protocol" json:"protocol"` // e.g. local
	Password   string    `gorm:"column:password" json:"-"`        // hashed password
	Provider   string    `gorm:"column:provider" json:"provider"`
	Identifier string    `gorm:"column:identifier" json:"identifier"`
	Tokens     string    `gorm:"column:tokens;type:json" json:"tokens"` // json configuration string
	UserID     uint      `gorm:"column:user" json:"user_id"`
	CreatedAt  time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Passport) TableName() string {
	return "konga_passports"
}

// KongNode represents the konga_kong_nodes table
type KongNode struct {
	ID                 uint      `gorm:"primaryKey;column:id" json:"id"`
	Name               string    `gorm:"column:name" json:"name"`
	Type               string    `gorm:"column:type;default:default" json:"type"` // default, key_auth, jwt, basic_auth
	KongAdminURL       string    `gorm:"column:kong_admin_url" json:"kong_admin_url"`
	NetdataURL         string    `gorm:"column:netdata_url" json:"netdata_url"`
	KongAPIKey         string    `gorm:"column:kong_api_key" json:"kong_api_key"`
	JWTAlgorithm       string    `gorm:"column:jwt_algorithm;default:HS256" json:"jwt_algorithm"`
	JWTKey             string    `gorm:"column:jwt_key" json:"jwt_key"`
	JWTSecret          string    `gorm:"column:jwt_secret" json:"jwt_secret"`
	Username           string    `gorm:"column:username" json:"username"`
	Password           string    `gorm:"column:password" json:"password"`
	KongVersion        string    `gorm:"column:kong_version;default:0-10-x" json:"kong_version"`
	HealthChecks       bool      `gorm:"column:health_checks;default:false" json:"health_checks"`
	HealthCheckDetails string    `gorm:"column:health_check_details;type:json" json:"health_check_details"`
	Active             bool      `gorm:"column:active;default:false" json:"active"`
	CreatedAt          time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt          time.Time `gorm:"column:updatedAt" json:"updatedAt"`
	CreatedUserID      *uint     `gorm:"column:createdUserId" json:"createdUserId,omitempty"`
	UpdatedUserID      *uint     `gorm:"column:updatedUserId" json:"updatedUserId,omitempty"`
}

func (KongNode) TableName() string {
	return "konga_kong_nodes"
}

// AuditLog represents the konga_audit_logs table
type AuditLog struct {
	ID           uint      `gorm:"primaryKey;column:id" json:"id"`
	IPAddress    string    `gorm:"column:ip_address" json:"ip_address"`
	UserID       *uint     `gorm:"column:user_id" json:"user_id"`
	Username     string    `gorm:"column:username;default:anonymous" json:"username"`
	Action       string    `gorm:"column:action" json:"action"` // POST, PATCH, PUT, DELETE
	Entity       string    `gorm:"column:entity" json:"entity"` // plugins, services, routes, consumers, etc.
	URL          string    `gorm:"column:url" json:"url"`
	Payload      string    `gorm:"column:payload;type:json" json:"payload"`
	KongNodeName string    `gorm:"column:kong_node_name" json:"kong_node_name"`
	CreatedAt    time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (AuditLog) TableName() string {
	return "konga_audit_logs"
}
