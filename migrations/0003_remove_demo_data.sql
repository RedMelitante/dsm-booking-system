-- Removes the demo businesses that 0002 used to seed (owner "demo-owner"),
-- including any bookings made on them, so production starts empty.
-- On a database that never had the demo data this changes nothing.
DELETE FROM bookings WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = 'demo-owner');
DELETE FROM notifications_sent WHERE booking_id NOT IN (SELECT id FROM bookings);
DELETE FROM google_connections WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = 'demo-owner');
DELETE FROM time_off WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = 'demo-owner');
DELETE FROM hours WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = 'demo-owner');
DELETE FROM services WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = 'demo-owner');
DELETE FROM staff WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = 'demo-owner');
DELETE FROM digests_sent WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = 'demo-owner');
DELETE FROM businesses WHERE owner_id = 'demo-owner';
DELETE FROM sessions WHERE user_id = 'demo-owner';
DELETE FROM users WHERE id = 'demo-owner';
