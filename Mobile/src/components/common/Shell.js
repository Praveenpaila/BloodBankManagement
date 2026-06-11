import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useAppContext } from "../../context/AppContext";
import { theme } from "../../styles/theme";

export function Shell({ title, children, tabs = [], loading = false }) {
  const ctx = useAppContext();

  return (
    <View style={styles.screen}>
      {/* ── Top bar ───────────────────────────────────── */}
      <View style={styles.topbar}>
        <View style={styles.headerLeft}>
          {/* Brand eyebrow — matches .sidebar-link branding */}
          <View style={styles.brandRow}>
            <View style={styles.avatarDot} />
            <Text style={styles.brandText}>BloodLink</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {ctx.user ? (
          <Pressable style={styles.logoutBtn} onPress={ctx.logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ── Connection banner ──────────────────────────── */}
      {ctx.serverStatus === "disconnected" ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠ Cannot reach server</Text>
        </View>
      ) : null}

      {/* ── Tab bar (horizontal scrolling nav) ────────── */}
      {tabs.length ? (
        <View style={styles.tabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {tabs.map((tab) => {
              const active = ctx.route === tab.route;
              return (
                <Pressable
                  key={tab.route}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => ctx.setRoute(tab.route)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* ── Page content ─────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          loading && styles.loadingContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator
            color={theme.colors.primary}
            size="large"
            style={styles.spinner}
          />
        ) : (
          children
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },

  // ── Top bar
  topbar: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  avatarDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  brandText: {
    ...theme.type.eyebrow,
    color: theme.colors.primary,
  },
  title: {
    ...theme.type.h2,
    color: theme.colors.text,
    marginTop: 1,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.buttonOutline,
  },
  logoutText: {
    ...theme.type.caption,
    color: theme.colors.muted,
  },

  // ── Offline banner
  offlineBanner: {
    backgroundColor: theme.colors.warningBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.warningBorder,
    paddingVertical: 7,
    paddingHorizontal: theme.spacing.base,
    alignItems: "center",
  },
  offlineText: {
    ...theme.type.caption,
    color: theme.colors.warningText,
    fontWeight: "900",
  },

  // ── Tab bar — matches .sidebar-link.is-active from index.css
  tabsWrap: {
    height: 52,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabsRow: {
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
  },
  tab: {
    marginVertical: 9,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.tab,
    backgroundColor: theme.colors.skeletonB,  // #F1F5F9
    justifyContent: "center",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sidebarActive,
  },
  tabText: {
    ...theme.type.small,
    color: theme.colors.muted,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  // ── Content scroll
  scroll: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.base,
    paddingBottom: 48,
  },
  loadingContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    marginVertical: 40,
  },
});
