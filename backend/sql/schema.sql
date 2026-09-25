-- PGScout schema — matches the SRS Section 5 data model and the ER/class diagrams.
CREATE DATABASE IF NOT EXISTS pgscout;
USE pgscout;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('seeker','owner','institution_admin','system_admin') NOT NULL DEFAULT 'seeker',
  institution_name VARCHAR(160) NULL,
  is_suspended TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  address VARCHAR(255) NOT NULL,
  area VARCHAR(120) NOT NULL,
  lat DECIMAL(10,6) NULL,
  lng DECIMAL(10,6) NULL,
  curfew_time VARCHAR(40) NULL,
  rules TEXT NULL,
  status ENUM('unlisted','pending','approved','rejected') NOT NULL DEFAULT 'pending',
  recommended TINYINT(1) NOT NULL DEFAULT 0,
  recommended_institution VARCHAR(160) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  type ENUM('Single','Double','Triple') NOT NULL DEFAULT 'Double',
  price DECIMAL(10,2) NOT NULL,
  deposit DECIMAL(10,2) NOT NULL DEFAULT 0,
  gender_pref ENUM('boys','girls','co') NOT NULL DEFAULT 'co',
  status ENUM('unlisted','pending','available','reserved','occupied','waitlisted','maintenance') NOT NULL DEFAULT 'unlisted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE amenities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE listing_amenities (
  listing_id INT NOT NULL,
  amenity_id INT NOT NULL,
  PRIMARY KEY (listing_id, amenity_id),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

CREATE TABLE photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  seeker_id INT NOT NULL,
  move_in_date DATE NOT NULL,
  message VARCHAR(500) NULL,
  status ENUM('new','pending','accepted','declined','completed') NOT NULL DEFAULT 'new',
  reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE waitlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  seeker_id INT NOT NULL,
  notified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  listing_id INT NOT NULL,
  seeker_id INT NOT NULL,
  stars TINYINT NOT NULL,
  text VARCHAR(1000) NULL,
  status ENUM('published','flagged','removed') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE review_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  owner_id INT NOT NULL,
  text VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE community_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  text VARCHAR(1000) NOT NULL,
  status ENUM('visible','flagged','removed') NOT NULL DEFAULT 'visible',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE community_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  owner_id INT NOT NULL,
  text VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('review','post') NOT NULL,
  target_id INT NOT NULL,
  flagged_by INT NOT NULL,
  reason VARCHAR(255) NULL,
  resolved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(60) NOT NULL,
  message VARCHAR(500) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  status ENUM('inactive','active') NOT NULL DEFAULT 'inactive',
  plan VARCHAR(60) NOT NULL DEFAULT 'premium_monthly',
  razorpay_order_id VARCHAR(120) NULL,
  razorpay_payment_id VARCHAR(120) NULL,
  current_period_end DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(60) NULL,
  target_id INT NULL,
  details VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);
