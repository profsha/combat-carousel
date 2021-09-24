/**
 * Hooks module
 * @module hooks
 */
import CombatCarousel from "./combat-carousel.mjs";
import registerSettings from "./settings.mjs";
import overrideMethods from "./overrides.mjs";
import { NAME, SETTING_KEYS, CAROUSEL_ICONS } from "./config.mjs";
import { getTokenFromCombatantId } from "./util.mjs";
import { preloadHandlebarsTemplates } from "./templates.mjs";
import { DEFAULT_CONFIG } from "./config.mjs";
import { TEMPLATE_PATH } from "./config.mjs";

/**
 * Registers hooks needed throughout the module
 */
export default function registerHooks() {

    /* -------------------------------------------- */
    /*                 System Hooks                 */
    /* -------------------------------------------- */

    /**
     * Init hook
     */
    Hooks.on("init", () => {
        registerSettings();
        overrideMethods();
        preloadHandlebarsTemplates();
    }); 

    /**
     * Ready hook
     */
    Hooks.on("ready", () => {
        CombatCarousel._onReady();
    });

    /* -------------------------------------------- */
    /*                 Entity Hooks                 */
    /* -------------------------------------------- */

    /* ------------------ Combat ------------------ */

    /**
     * Create Combat hook
     */
    Hooks.on("createCombat", async (combat, createData, options, userId) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || !ui.combatCarousel || ui.combatCarousel?._collapsed) return;
        
        ui.combatCarousel.render(true);
        
        const hasTurns = combat?.turns?.length;
        const carouselImg = ui?.controls?.element.find("img.carousel-icon");
        const newImgSrc = hasTurns ? CAROUSEL_ICONS.hasTurns : CAROUSEL_ICONS.noTurns;
        
        carouselImg.attr("src", newImgSrc);
    });

    /**
     * Update Combat hook
     */
    Hooks.on("updateCombat", (combat, update, options, userId) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || ui.combatCarousel?._collapsed) return;

        //console.log("combat update", {combat, update, options, userId});

        if (getProperty(update, "active") === true || hasProperty(update, "round")) {
            return ui.combatCarousel.render(true);
        }

        if (hasProperty(update, "turn")) {
            if (update.turn !== ui.combatCarousel.turn) {
                const combatant = combat.turns[update.turn];

                if (!combatant) return;

                ui.combatCarousel.turn = update.turn;
                
                return ui.combatCarousel.render();
                //return ui.combatCarousel.setActiveCombatant(combatant);
            }

            //ui.combatCarousel.render();
        }
        
        

        /*
        if (combat.turns.length <= 0) {
            ui.combatCarousel.collapse();
            ui.combatCarousel.setToggleIcon("noTurns");
        }
        */
        return ui.combatCarousel.render();
    });
    
    /**
     * Delete Combat hook
     */
    Hooks.on("deleteCombat", async (combat, options, userId) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || ui.combatCarousel?._collapsed) return;

        const hasCombat = game.combats.entities?.length;

        if (!hasCombat) {
            ui.combatCarousel.close();
            //await ui.combatCarousel.render(true);
            //ui.combatCarousel.collapse();
        }

        const carouselImg = ui.controls.element.find("img.carousel-icon");
        carouselImg.attr("src", CAROUSEL_ICONS.noCombat);
    });
    
    /* ----------------- Combatant ---------------- */

    /**
     * Create Combatant hook
     */
    Hooks.on("createCombatant", async (combatant, options, userId) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || !ui.combatCarousel || ui.combatCarousel?._collapsed) return;

        //console.log("create combatantant:", {combat, createData, options, userId});
        
        // calculate the new turn order
        const newTurns = combatant.parent?.setupTurns() ?? [];

        // grab the new combatant
        const turn = newTurns.find(t => t.id === combatant.id);

        if (!turn) return;

        const templateData = {
            combatant: ui.combatCarousel.prepareTurnData(turn)
        };

        if (!templateData) return;

        const combatantCard = await renderTemplate("modules/combat-carousel/templates/combatant-card.hbs", templateData);
        const index = newTurns.map(t => t.id).indexOf(combatant.id) ?? -1;
        
        await ui.combatCarousel.splide.emit("addCombatant", combatantCard, index);
        
        ui.combatCarousel.setToggleIcon();

        if (ui.combatCarousel._collapsed) {
            ui.combatCarousel.expand();
        }

        ui.combatCarousel.render();

        const carouselImg = ui.controls.element.find("img.carousel-icon");

        if (carouselImg.attr("src") != CAROUSEL_ICONS.hasTurns) carouselImg.attr("src", CAROUSEL_ICONS.hasTurns);
    });
    
    /**
     * Update Combatant hook
     */
    Hooks.on("updateCombatant", async (combatant, updateData, options, userId) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || ui.combatCarousel?._collapsed) return;
        
        //console.log("combatant update", {combat, update, options, userId});
        //ui.combatCarousel.splide.go()
        //ui.combatCarousel.splide.refresh();
        /*
        const turn = combat.turns.find(t => t.id === update.id);
        const combatant = CombatCarousel.prepareTurnData(turn);
        const template = await renderTemplate("modules/combat-carousel/templates/combatant-card.hbs", {combatant});
        const cardToReplace = ui.combatCarousel.element.find(`li[data-combatant-id="${update.id}"]`);
        cardToReplace.replaceWith(template);
        ui.combatCarousel.splide.refresh();
        */
        
        if (updateData?.hidden && !game.user.isGM) {
            return ui.combatCarousel.render(true);
        }

        const safeRender = debounce(() => {
            ui.combatCarousel.render(), 100
        });
        
        safeRender();
    });

    /**
     * Delete Combatant hook
     */
    Hooks.on("deleteCombatant", (combatant, options, userId) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || ui.combatCarousel?._collapsed) return;

        //console.log("delete combatant:", {combat, combatant, options, userId});
        
        const index = ui.combatCarousel.getCombatantSlideIndex(combatant);

        if (index < 0) return;

        ui.combatCarousel.splide.remove(index);
        ui.combatCarousel.setPosition({width: ui.combatCarousel._getMinimumWidth()});

        const combatHasTurns = combat?.turns?.length;

        const carouselImg = ui.controls.element.find("img.carousel-icon");

        if (!combatHasTurns) carouselImg.attr("src", CAROUSEL_ICONS.noTurns);
    });

    /* ------------------- Actor ------------------ */

    Hooks.on("updateActor", (actor, updateData, options, userId) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || ui.combatCarousel?._collapsed) return;

        if (!hasProperty(updateData, "data.attributes.hp.value") &&
            !hasProperty(updateData, "img") &&
            !hasProperty(updateData, "data.attributes.sp.value")
            ) return;
        // find any matching combat carousel combatants
        
        if (!game.combat?.combatants.some(c => c.actor.id === actor.id)) return;
        // update their hp bar

        ui.combatCarousel.render();
    });

    /* ------------------- Token ------------------ */

    Hooks.on("updateToken", (token, updateData, options, userId) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || ui.combatCarousel?._collapsed) return;

        //console.log("token update:", scene,token,update,options,userId);
        if (
            !hasProperty(updateData, "effects")
            && !hasProperty(updateData, "overlayEffect")
            && !hasProperty(updateData, "actorData.effects")
            && !hasProperty(updateData, "actorData.data.attributes.hp.value") 
            && !hasProperty(updateData, "actorData.data.attributes.sp.value")
            && !hasProperty(updateData, "img")
            && !hasProperty(updateData, "actorData.img")
        ) return;
        // find any matching combat carousel combatants
        
        if (!game.combat.combatants.some(c => c.token.id === token.id)) return;
        
        // update their hp bar and effects
        ui.combatCarousel.render();
    });

    /* -------------------------------------------- */
    /*                 Render Hooks                 */
    /* -------------------------------------------- */

    /**
     * SceneNavigation render hook
     */
    Hooks.on("renderSceneNavigation", (app, html, data) => {
        // if (!ui.combatCarousel) return;

        // const collapsed = data?.collapsed || app?.data?.collapsed || null;
        
        // if (collapsed) {
        //     ui.combatCarousel.element.css({"top": "12px"});
        //     ui.combatCarousel.element.find(".carousel-icon").css({"top": "47px"});
        // } else {
        //     ui.combatCarousel.element.css({"top": `${app.element.height() + 12 + 5}px`});
        //     ui.combatCarousel.element.find(".carousel-icon").css({"top": "auto"});
        // }
    });

    /**
     * Combat Tracker Render hook
     */
    Hooks.on("renderCombatTracker", (app, html, data) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled) return;

        const viewed = canvas.scene;
        const rendered = ui?.combatCarousel?.rendered;
        const collapsed = ui?.combatCarousel?._collapsed;
        const trackerCombat = ui.combat.viewed;
        const carouselCombat = ui.combatCarousel?.combat;
        const combatMatch = trackerCombat?.id === carouselCombat?.id;
        const isViewedCombat = trackerCombat?.scene == viewed;

        if (!data?.hasCombat && rendered) {
            ui.combatCarousel.close();
        }

        if (data?.hasCombat && isViewedCombat && !combatMatch && collapsed === false) {
            ui.combatCarousel.render(true);
        }

        ui?.combatCarousel?.setToggleIcon();
        //console.log("combat tracker rendered:", app, html, data);
    });

    /**
     * CombatCarousel render hook
     */
    Hooks.on("renderCombatCarousel", (app, html, data) => {
        //app.activateCombatantSlide();
    });

    /* -------------------------------------------- */
    /*              Miscellaneous Hooks             */
    /* -------------------------------------------- */

    /**
     * SceneNavigation collapse/expand hook
     */
    Hooks.on("collapseSceneNavigation", (app, collapsed) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || !ui.combatCarousel) return;

        /**
        if (collapsed) {
            ui.combatCarousel.element.css({"top": "12px"});
            ui.combatCarousel.element.find(".carousel-icon").css({"top": "42px"});
        } else {
            ui.combatCarousel.element.css({"top": `${app.element.height() + 12 + 5}px`});
            ui.combatCarousel.element.find(".carousel-icon").css({"top": "auto"});
        }
        */
    });

    /**
     * Sidebar Collapse Hook
     */
    Hooks.on("sidebarCollapse", (app, collapsed) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || !ui.combatCarousel || ui.combatCarousel?._collapsed) return;

        ui.combatCarousel.setPosition();
    });

    /**
     * Hover Token hook
     */
    Hooks.on("hoverToken", (token, hovered) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || ui.combatCarousel?._collapsed) return;

        if (!ui?.combatCarousel?.splide || !game.combat) return;

        const combatant = game.combat.combatants.find(c => c.token?.id === token.id);

        if (!combatant) return;

        const slide = ui.combatCarousel?.splide?.root.querySelector(`li.splide__slide[data-combatant-id="${combatant.id}"]`);
        
        if (!slide) return;

        switch (hovered) {
            case true:
                const borderColor = PIXI.utils.hex2string(token._getBorderColor());
                return slide.style.borderColor = borderColor;
                
            case false:
                if (token._controlled) return;
                return slide.style.borderColor = null;

            default:
                return;
        }
        /*
        if (hovered) {
            const combatant = game.combat.combatants.find(c => c.token.id === token.id);
            const borderColor = PIXI.utils.hex2string(token._getBorderColor());

            if (!combatant) return;
            const slide = ui.combatCarousel?.splide?.root.querySelector(`li.splide__slide[data-combatant-id="${combatant.id}"]`);
            if (!slide) return;
            return slide.style.borderColor = borderColor;
        }

        const controlledTokens = canvas.tokens.controlled;
        const controlledTokenIds = controlledTokens ? controlledTokens.map(t => t.id) : [];
        const controlledCombatants = game.combat.combatants.filter(c => controlledTokenIds.includes(c.token.id));
        const controlledCombatantIds = controlledCombatants ? controlledCombatants.map(c => c.id) : [];
        const slides = ui.combatCarousel.splide.root.querySelectorAll("li.splide__slide");
        return slides.forEach(s => {
            if (controlledCombatantIds.includes(s.dataset.combatantId)) return;
            s.style.borderColor = null;
        });
        */
    });

    /**
     * Control Token hook
     */
    Hooks.on("controlToken", (token, controlled) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled || !game.combat || !ui.combatCarousel?.splide || ui.combatCarousel?._collapsed) return;

        const combatant = game.combat.combatants.find(c => c.token?.id === token.id);

        if (!combatant) return;

        const slide = ui.combatCarousel?.splide?.root.querySelector(`li.splide__slide[data-combatant-id="${combatant.id}"]`);
        
        if (!slide) return;

        switch (controlled) {
            case true:
                const borderColor = PIXI.utils.hex2string(token._getBorderColor());
                return slide.style.borderColor = borderColor;
                
            case false:
                return slide.style.borderColor = null;

            default:
                return;
        }
    });

    /**
     * Render Scene Controls Hook
     */
    Hooks.on("renderSceneControls", async (app, html, data) => {
        const enabled = game.settings.get(NAME, SETTING_KEYS.enabled);

        if (!enabled) return;

        return CombatCarousel._onRenderSceneControls(app, html, data);
    });
}
