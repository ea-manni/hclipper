"""
hclipper Procedural Motion Asset Catalog
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Generates customizable, vector-sharp HTML/SVG assets for any transcript moment:
- Simulated Chat Bubbles (WhatsApp / iMessage)
- Animated Currency & Wealth Badges (₦ Naira, $ USD, etc.)
- Brand & App Badges (Bolt, inDrive, Uber, YouTube, TikTok, etc.)
- Conceptual Math & Logic Overlays (dy/dx, integrals, lightbulbs)
- Scripture & Wisdom Plaques (Book Chapter:Verse)
"""

from typing import Dict, Any

class AssetCatalog:
    """Provides HTML/SVG templates and rendering configurations for bespoke assets."""

    @staticmethod
    def render_chat_bubble(cue: Dict[str, Any]) -> str:
        sender = cue.get("sender", "Ella")
        text = cue.get("text", "I'll give you 5k for every kg gained")
        platform = cue.get("platform", "whatsapp") # "whatsapp" or "imessage"
        avatar_initial = sender[0].upper() if sender else "A"
        time_str = cue.get("time_str", "12:48")

        if platform == "whatsapp":
            return f"""
            <div class="asset-wrapper chat-bubble-whatsapp">
              <div class="chat-header">
                <div class="chat-avatar">{avatar_initial}</div>
                <div class="chat-sender">{sender} <span class="chat-heart">💚</span></div>
              </div>
              <div class="chat-body">{text}</div>
              <div class="chat-footer">
                <span class="chat-timestamp">{time_str}</span>
                <span class="chat-ticks">✓✓</span>
              </div>
            </div>
            """
        else:
            return f"""
            <div class="asset-wrapper chat-bubble-imessage">
              <div class="imessage-sender">{sender}</div>
              <div class="imessage-body">{text}</div>
            </div>
            """

    @staticmethod
    def render_currency_badge(cue: Dict[str, Any]) -> str:
        currency = cue.get("currency", "₦")
        amount = cue.get("amount", "30,000")
        label = cue.get("label", "CASH PRIZE")
        return f"""
        <div class="asset-wrapper currency-badge">
          <div class="currency-coin">
            <span class="coin-symbol">{currency}</span>
          </div>
          <div class="currency-info">
            <div class="currency-amount">{currency}{amount}</div>
            <div class="currency-label">{label}</div>
          </div>
        </div>
        """

    @staticmethod
    def render_brand_stickers(cue: Dict[str, Any]) -> str:
        brands = cue.get("brands", ["bolt", "indrive"])
        
        brand_html = []
        for b in brands:
            b_norm = b.lower().strip()
            if b_norm == "bolt":
                brand_html.append("""
                <div class="brand-item bolt-badge">
                  <span class="bolt-text">Bolt</span>
                </div>
                """)
            elif b_norm == "indrive":
                brand_html.append("""
                <div class="brand-item indrive-badge">
                  <span class="indrive-icon">iD</span>
                  <span class="indrive-text">inDrive</span>
                </div>
                """)
            elif b_norm == "uber":
                brand_html.append("""
                <div class="brand-item uber-badge">
                  <span class="uber-text">Uber</span>
                </div>
                """)
            else:
                brand_html.append(f"""
                <div class="brand-item generic-brand-badge">
                  <span>{b}</span>
                </div>
                """)

        separator = '<span class="brand-vs">or</span>' if len(brand_html) > 1 else ''
        return f"""
        <div class="asset-wrapper brand-stickers-row">
          {separator.join(brand_html)}
        </div>
        """

    @staticmethod
    def render_conceptual_math(cue: Dict[str, Any]) -> str:
        formula = cue.get("formula", "dy / dx = ?")
        subtext = cue.get("subtext", "Math is not mathing")
        return f"""
        <div class="asset-wrapper math-overlay">
          <div class="math-chalk">
            <span class="math-fraction">
              <span class="num">dy</span>
              <span class="den">dx</span>
            </span>
            <span class="math-eq">=</span>
            <span class="math-res">?</span>
          </div>
          <div class="math-subtext">{subtext}</div>
        </div>
        """

    @staticmethod
    def render_scripture_plaque(cue: Dict[str, Any]) -> str:
        reference = cue.get("reference", "PROVERBS 29:18")
        text = cue.get("text", "Where there is no vision, the people perish.")
        return f"""
        <div class="asset-wrapper scripture-plaque">
          <div class="scripture-badge">
            <span class="scripture-icon">📖</span>
            <span class="scripture-ref">{reference}</span>
          </div>
          <div class="scripture-quote">"{text}"</div>
        </div>
        """

    @staticmethod
    def render_warning_stamp(cue: Dict[str, Any]) -> str:
        headline = cue.get("headline", "WARNING: THE COMPARISON TRAP")
        return f"""
        <div class="asset-wrapper warning-stamp">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text">{headline}</span>
        </div>
        """

    @classmethod
    def render_asset_html(cls, cue: Dict[str, Any]) -> str:
        a_type = cue.get("type", "chat_bubble")
        if a_type == "chat_bubble":
            return cls.render_chat_bubble(cue)
        elif a_type == "currency_badge":
            return cls.render_currency_badge(cue)
        elif a_type == "brand_stickers":
            return cls.render_brand_stickers(cue)
        elif a_type == "conceptual_math":
            return cls.render_conceptual_math(cue)
        elif a_type == "scripture_plaque":
            return cls.render_scripture_plaque(cue)
        elif a_type == "warning_stamp":
            return cls.render_warning_stamp(cue)
        return ""
