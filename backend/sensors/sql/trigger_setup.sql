-- PostgreSQL trigger function and trigger setup
-- This can be run manually if migrations don't work

-- Create the trigger function
CREATE OR REPLACE FUNCTION notify_sensor_update()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('sensor_updates', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on sensor_readings table
DROP TRIGGER IF EXISTS sensor_update_trigger ON sensor_readings;
CREATE TRIGGER sensor_update_trigger
AFTER INSERT ON sensor_readings
FOR EACH ROW EXECUTE FUNCTION notify_sensor_update();

