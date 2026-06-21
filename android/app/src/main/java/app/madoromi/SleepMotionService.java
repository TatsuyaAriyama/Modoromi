package app.madoromi;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.List;

/**
 * Foreground service that keeps the accelerometer running with the screen off
 * and reduces samples to body-movement events. The detection (gravity removal,
 * threshold, debounce) mirrors src/domain/motionDetect.ts so every platform
 * agrees. Movements accumulate in a static buffer the plugin drains on stop().
 *
 * Battery: the listener registers with a 60s max-report-latency so the SoC can
 * batch samples in the hardware FIFO and stay mostly asleep between flushes.
 */
public class SleepMotionService extends Service implements SensorEventListener {

    private static final String CHANNEL_ID = "madoromi_sleep_motion";
    private static final int NOTIFICATION_ID = 0x5_1ee9; // arbitrary, stable

    // Detection constants — keep in lockstep with src/domain/motionDetect.ts.
    private static final double THRESHOLD = 1.2; // m/s² of linear acceleration
    private static final double DEBOUNCE_MS = 4000;
    private static final double TAU_MS = 600;
    private static final double MAX_DT_MS = 1000;

    /** Movements are also streamed here so they survive a process kill. */
    static final String LOG_FILE = "sleep_motion.log";

    private static final List<float[]> MOVEMENTS = new ArrayList<>();
    private static long startMs;

    private SensorManager sm;
    private BufferedWriter writer;
    private double gx, gy, gz;
    private boolean primed = false;
    private double prevT;
    private double lastEventT = -Double.MAX_VALUE;

    @Override
    public void onCreate() {
        super.onCreate();
        synchronized (MOVEMENTS) {
            MOVEMENTS.clear();
        }
        primed = false;
        lastEventT = -Double.MAX_VALUE;
        startMs = System.currentTimeMillis();

        // Fresh log: clear any prior session's persisted movements, then stream
        // this session's to disk so a kill can be recovered on next launch.
        File log = new File(getFilesDir(), LOG_FILE);
        log.delete();
        try {
            writer = new BufferedWriter(new FileWriter(log, true));
        } catch (Exception e) {
            writer = null;
        }

        startInForeground();

        sm = (SensorManager) getSystemService(SENSOR_SERVICE);
        if (sm != null) {
            Sensor accel = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (accel != null) {
                // ~10 Hz sampling, batched up to 60s (FIFO) to spare the battery.
                sm.registerListener(this, accel, 100_000, 60_000_000);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        final double t = System.currentTimeMillis();
        final double x = e.values[0], y = e.values[1], z = e.values[2];
        if (!primed) {
            gx = x; gy = y; gz = z;
            primed = true;
            prevT = t;
            return;
        }
        final double dt = Math.min(MAX_DT_MS, Math.max(1, t - prevT));
        prevT = t;
        final double alpha = dt / (TAU_MS + dt);
        gx += alpha * (x - gx);
        gy += alpha * (y - gy);
        gz += alpha * (z - gz);
        final double lx = x - gx, ly = y - gy, lz = z - gz;
        final double mag = Math.sqrt(lx * lx + ly * ly + lz * lz);
        if (mag < THRESHOLD) return;
        if (t - lastEventT < DEBOUNCE_MS) return;
        lastEventT = t;
        final float minutes = (float) Math.max(0, Math.round((t - startMs) / 60000.0));
        synchronized (MOVEMENTS) {
            MOVEMENTS.add(new float[] { minutes, (float) mag });
        }
        if (writer != null) {
            try {
                writer.write(minutes + "," + (float) mag + "\n");
                writer.flush();
            } catch (Exception ex) {
                // best-effort: a failed append just means that movement isn't
                // recoverable if the process is killed.
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    /** Snapshot the movements collected so far (called by the plugin on stop). */
    static List<float[]> drainMovements() {
        synchronized (MOVEMENTS) {
            return new ArrayList<>(MOVEMENTS);
        }
    }

    @Override
    public void onDestroy() {
        if (sm != null) sm.unregisterListener(this);
        if (writer != null) {
            try {
                writer.close();
            } catch (Exception e) {
                // ignore
            }
            writer = null;
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startInForeground() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Sleep tracking", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        Notification notification = builder
            .setContentTitle("Madoromi")
            .setContentText("Tracking your sleep")
            // Use the app's own icon — avoids depending on a status-bar drawable.
            .setSmallIcon(getApplicationInfo().icon)
            .setOngoing(true)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }
}
