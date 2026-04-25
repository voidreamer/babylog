#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BabylogBridge, "BabylogBridge",
    CAP_PLUGIN_METHOD(setSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setSelectedBaby, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(drainPendingActions, CAPPluginReturnPromise);
)
