import 'package:flutter/material.dart';

class EntokColors {
  static const green = Color(0xFF31C979);
  static const greenDark = Color(0xFF1FA866);
  static const mint = Color(0xFFEAFBF2);
  static const mintStrong = Color(0xFFD8FBE7);
  static const background = Color(0xFFF7F8FA);
  static const text = Color(0xFF1D2735);
  static const muted = Color(0xFF6F7B8C);
  static const border = Color(0xFFE1E7EC);
  static const danger = Color(0xFFFF424B);
  static const warning = Color(0xFFC7861C);
}

class EntokTheme {
  static ThemeData data() {
    return ThemeData(
      scaffoldBackgroundColor: EntokColors.background,
      colorScheme: ColorScheme.fromSeed(seedColor: EntokColors.green),
      useMaterial3: true,
      textTheme: const TextTheme(
        headlineLarge: TextStyle(color: EntokColors.text, fontWeight: FontWeight.w900),
        headlineMedium: TextStyle(color: EntokColors.text, fontWeight: FontWeight.w900),
        titleLarge: TextStyle(color: EntokColors.text, fontWeight: FontWeight.w900),
        titleMedium: TextStyle(color: EntokColors.text, fontWeight: FontWeight.w800),
        bodyLarge: TextStyle(color: EntokColors.text),
        bodyMedium: TextStyle(color: EntokColors.muted),
      ),
    );
  }
}

class EntokTopHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? actionIcon;
  final String? profileImage;
  final VoidCallback? onAction;
  final bool showBack;
  final IconData? badgeIcon;

  const EntokTopHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionIcon,
    this.profileImage,
    this.onAction,
    this.showBack = false,
    this.badgeIcon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(24, MediaQuery.of(context).padding.top + 22, 24, 28),
      decoration: BoxDecoration(
        color: EntokColors.green,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(38),
          bottomRight: Radius.circular(38),
        ),
        boxShadow: [
          BoxShadow(
            color: EntokColors.green.withValues(alpha: 0.22),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          if (showBack) ...[
            GestureDetector(
              onTap: () => Navigator.maybePop(context),
              child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 25),
            ),
            const SizedBox(width: 18),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    height: 1.12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    subtitle!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xE9FFFFFF),
                      fontSize: 15,
                      height: 1.28,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (actionIcon != null || badgeIcon != null) ...[
            const SizedBox(width: 12),
            GestureDetector(
              onTap: onAction,
              child: Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: EntokColors.mint,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.11),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: profileImage != null && profileImage!.isNotEmpty
                      ? Image.network(
                          profileImage!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Icon(actionIcon ?? badgeIcon, color: EntokColors.green, size: 28),
                        )
                      : Icon(actionIcon ?? badgeIcon, color: EntokColors.green, size: 28),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class EntokCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final double radius;
  final bool elevated;

  const EntokCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color = Colors.white,
    this.borderColor = EntokColors.border,
    this.radius = 22,
    this.elevated = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor),
        boxShadow: elevated
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.045),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: child,
    );
  }
}

InputDecoration entokInputDecoration(String label, IconData icon, {Widget? suffixIcon}) {
  return InputDecoration(
    hintText: label,
    prefixIcon: Icon(icon, color: EntokColors.green, size: 27),
    suffixIcon: suffixIcon,
    filled: true,
    fillColor: Colors.white,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: EntokColors.border)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: EntokColors.border)),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(color: EntokColors.green, width: 1.7),
    ),
  );
}

class EntokPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool danger;
  final IconData? icon;

  const EntokPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.danger = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: icon == null ? const SizedBox.shrink() : Icon(icon, size: 22),
        label: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 14,
            letterSpacing: 1.0,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: danger ? EntokColors.danger : EntokColors.green,
          foregroundColor: Colors.white,
          elevation: 10,
          shadowColor: (danger ? EntokColors.danger : EntokColors.green).withValues(alpha: 0.28),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
      ),
    );
  }
}

class EntokIconBox extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;

  const EntokIconBox({
    super.key,
    required this.icon,
    this.color = EntokColors.green,
    this.size = 58,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(icon, color: color, size: size * 0.48),
    );
  }
}
