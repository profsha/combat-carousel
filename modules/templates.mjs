/**
 * Templates module
 * @module templates
 */

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * Taken from dnd5e system (see link)
 * @link https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/templates.js
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

    // Define template paths to load
    const templatePaths = [
        "modules/combat-carousel-test/templates/combatant-card.hbs"
    ];

    console.log('LOAD TEMPLATE', _templateCache)

    if (_templateCache && _templateCache["modules/combat-carousel/templates/combatant-card.hbs"]) {
        delete _templateCache["modules/combat-carousel/templates/combatant-card.hbs"];
    }
  
    // Load the template parts
    return loadTemplates(templatePaths);
};