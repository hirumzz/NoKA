package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"konga-backend/utils"
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
	ActivationToken string     `gorm:"column:activationToken" json:"-"`
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
	KongProxyURL       string    `gorm:"column:kong_proxy_url" json:"kong_proxy_url"`
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

func (n *KongNode) BeforeSave(tx *gorm.DB) (err error) {
	if n.KongAPIKey != "" {
		enc, err := utils.Encrypt(n.KongAPIKey)
		if err != nil {
			return err
		}
		n.KongAPIKey = enc
	}
	if n.Password != "" {
		enc, err := utils.Encrypt(n.Password)
		if err != nil {
			return err
		}
		n.Password = enc
	}
	if n.JWTSecret != "" {
		enc, err := utils.Encrypt(n.JWTSecret)
		if err != nil {
			return err
		}
		n.JWTSecret = enc
	}
	return nil
}

func (n *KongNode) AfterSave(tx *gorm.DB) (err error) {
	if n.KongAPIKey != "" {
		dec, err := utils.Decrypt(n.KongAPIKey)
		if err == nil {
			n.KongAPIKey = dec
		}
	}
	if n.Password != "" {
		dec, err := utils.Decrypt(n.Password)
		if err == nil {
			n.Password = dec
		}
	}
	if n.JWTSecret != "" {
		dec, err := utils.Decrypt(n.JWTSecret)
		if err == nil {
			n.JWTSecret = dec
		}
	}
	return nil
}

func (n *KongNode) AfterFind(tx *gorm.DB) (err error) {
	if n.KongAPIKey != "" {
		dec, err := utils.Decrypt(n.KongAPIKey)
		if err == nil {
			n.KongAPIKey = dec
		}
	}
	if n.Password != "" {
		dec, err := utils.Decrypt(n.Password)
		if err == nil {
			n.Password = dec
		}
	}
	if n.JWTSecret != "" {
		dec, err := utils.Decrypt(n.JWTSecret)
		if err == nil {
			n.JWTSecret = dec
		}
	}
	return nil
}

// AuditLog represents the konga_audit_logs table
type AuditLog struct {
	ID           uint           `gorm:"primaryKey;column:id" json:"id"`
	IPAddress    string         `gorm:"column:ip_address" json:"ip_address"`
	UserID       *uint          `gorm:"column:user_id" json:"user_id"`
	Username     string         `gorm:"column:username;default:anonymous" json:"username"`
	Action       string         `gorm:"column:action" json:"action"` // POST, PATCH, PUT, DELETE
	Entity       string         `gorm:"column:entity" json:"entity"` // plugins, services, routes, consumers, etc.
	URL          string         `gorm:"column:url" json:"url"`
	Payload      datatypes.JSON `gorm:"column:payload;type:json" json:"payload"`
	KongNodeName string         `gorm:"column:kong_node_name" json:"kong_node_name"`
	CreatedAt    time.Time      `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
}

func (AuditLog) TableName() string {
	return "konga_audit_logs"
}

// KongaComment represents the konga_comments table
type KongaComment struct {
	ID            uint      `gorm:"primaryKey;column:id" json:"id"`
	ReferenceID   string    `gorm:"column:referenceId;not null" json:"referenceId"`
	ReferenceType string    `gorm:"column:referenceType;not null" json:"referenceType"` // route, service, consumer
	Content       string    `gorm:"column:content;not null" json:"content"`
	UserID        uint      `gorm:"column:user" json:"userId"`
	User          User      `gorm:"foreignKey:UserID" json:"user"`
	CreatedAt     time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (KongaComment) TableName() string {
	return "konga_comments"
}

// KongaNotification represents the konga_notifications table
type KongaNotification struct {
	ID          uint      `gorm:"primaryKey;column:id" json:"id"`
	Message     string    `gorm:"column:message;not null" json:"message"`
	Icon        string    `gorm:"column:icon;default:mdi-message-outline" json:"icon"`
	State       string    `gorm:"column:state" json:"state"`
	StateParams string    `gorm:"column:stateParams;type:json" json:"stateParams"`
	UserID      *uint     `gorm:"column:user" json:"userId"`
	User        *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (KongaNotification) TableName() string {
	return "konga_notifications"
}

// BlacklistedToken represents the konga_blacklisted_tokens table
type BlacklistedToken struct {
	ID        uint      `gorm:"primaryKey;column:id" json:"id"`
	Jti       string    `gorm:"uniqueIndex;column:jti;not null" json:"jti"`
	ExpiresAt time.Time `gorm:"column:expires_at;not null;index" json:"expires_at"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
}

func (BlacklistedToken) TableName() string {
	return "konga_blacklisted_tokens"
}

// ReachabilityStatus represents the konga_reachability_status table
type ReachabilityStatus struct {
	ID         uint      `gorm:"primaryKey;column:id" json:"id"`
	EntityID   string    `gorm:"uniqueIndex:idx_entity;column:entity_id" json:"entity_id"`
	EntityType string    `gorm:"uniqueIndex:idx_entity;column:entity_type" json:"entity_type"` // "service" or "route"
	Status     string    `gorm:"column:status" json:"status"`                                  // "reachable" or "unreachable"
	Message    string    `gorm:"column:message" json:"message"`
	StatusCode int       `gorm:"column:status_code" json:"status_code"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (ReachabilityStatus) TableName() string {
	return "konga_reachability_status"
}

// Snapshot represents the konga_snapshots table
type Snapshot struct {
	ID        uint      `gorm:"primaryKey;column:id" json:"id"`
	Name      string    `gorm:"column:name;not null" json:"name"`
	Data      string    `gorm:"column:data;type:json;not null" json:"data"`
	NodeName  string    `gorm:"column:node_name" json:"node_name"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
}

func (Snapshot) TableName() string {
	return "konga_snapshots"
}
