package app.madoromi;

import android.content.Context;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.List;

/**
 * SleepMotionPlugin — background body-movement recording for a sleep session.
 *
 * The web DeviceMotion stream stops when the screen locks, so a foreground
 * service ({@link SleepMotionService}) holds the accelerometer listener for the
 * whole night and reduces samples to movements on the fly (same algorithm as
 * src/domain/motionDetect.ts). start() launches it; stop() drains the movements
 * and tears it down.
 *
 * Wiring: registered in MainActivity via registerPlugin(SleepMotionPlugin.class);
 * the service + foreground-service permissions are declared in AndroidManifest.
 */
@CapacitorPlugin(name = "SleepMotion")
public class SleepMotionPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        boolean ok = sm != null && sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null;
        JSObject ret = new JSObject();
        ret.put("available", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        Intent intent = new Intent(getContext(), SleepMotionService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void recover(PluginCall call) {
        // The service streams movements to a file; if it was killed mid-night,
        // the file still holds what it captured. Its mere existence means
        // tracking ran (an empty file = a still night), so recovered = exists.
        File log = new File(getContext().getFilesDir(), SleepMotionService.LOG_FILE);
        JSArray arr = new JSArray();
        boolean recovered = log.exists();
        if (recovered) {
            try (BufferedReader reader = new BufferedReader(new FileReader(log))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] parts = line.split(",");
                    if (parts.length == 2) {
                        JSObject o = new JSObject();
                        o.put("t", (int) Float.parseFloat(parts[0]));
                        o.put("magnitude", Math.round(Float.parseFloat(parts[1]) * 100.0) / 100.0);
                        arr.put(o);
                    }
                }
            } catch (Exception e) {
                // ignore — return whatever parsed
            }
            log.delete();
        }
        JSObject ret = new JSObject();
        ret.put("movements", arr);
        ret.put("recovered", recovered);
        call.resolve(ret);
    }

    @PluginMethod
    public void isUnrestricted(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean ok = pm == null
            || pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        JSObject ret = new JSObject();
        ret.put("unrestricted", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestUnrestricted(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        List<float[]> movements = SleepMotionService.drainMovements();
        getContext().stopService(new Intent(getContext(), SleepMotionService.class));

        JSArray arr = new JSArray();
        for (float[] m : movements) {
            JSObject o = new JSObject();
            o.put("t", (int) m[0]);
            o.put("magnitude", Math.round(m[1] * 100.0) / 100.0);
            arr.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("movements", arr);
        call.resolve(ret);
    }
}
