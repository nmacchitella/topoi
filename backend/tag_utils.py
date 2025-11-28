"""
Tag utilities for random colors and icon suggestions
"""
import secrets

# Tag color palette - matches frontend tagColors.ts
TAG_COLORS = [
    '#EF4444',  # Red
    '#F97316',  # Orange
    '#F59E0B',  # Amber
    '#84CC16',  # Lime
    '#22C55E',  # Green
    '#10B981',  # Emerald
    '#14B8A6',  # Teal
    '#06B6D4',  # Cyan
    '#0EA5E9',  # Sky
    '#3B82F6',  # Blue (default)
    '#6366F1',  # Indigo
    '#8B5CF6',  # Violet
    '#A855F7',  # Purple
    '#D946EF',  # Fuchsia
    '#EC4899',  # Pink
    '#F43F5E',  # Rose
]

# Default tag color
DEFAULT_TAG_COLOR = '#3B82F6'

# Material Symbol icons for tags - comprehensive list organized by category
# Format: { 'name': icon_name, 'keywords': [related words for matching] }
MATERIAL_ICONS = [
    # Food & Drink
    {'name': 'restaurant', 'keywords': ['restaurant', 'food', 'eat', 'dining', 'dinner', 'lunch']},
    {'name': 'restaurant_menu', 'keywords': ['menu', 'dining', 'food']},
    {'name': 'local_pizza', 'keywords': ['pizza', 'italian', 'pizzeria']},
    {'name': 'ramen_dining', 'keywords': ['ramen', 'noodle', 'asian', 'japanese', 'soup', 'pho']},
    {'name': 'local_cafe', 'keywords': ['cafe', 'coffee', 'espresso', 'latte', 'cappuccino']},
    {'name': 'coffee', 'keywords': ['coffee', 'espresso', 'caffeine']},
    {'name': 'local_bar', 'keywords': ['bar', 'pub', 'beer', 'drinks', 'cocktail', 'wine']},
    {'name': 'liquor', 'keywords': ['liquor', 'spirits', 'alcohol', 'whiskey']},
    {'name': 'wine_bar', 'keywords': ['wine', 'vineyard', 'winery']},
    {'name': 'sports_bar', 'keywords': ['sports bar', 'pub', 'games']},
    {'name': 'bakery_dining', 'keywords': ['bakery', 'bread', 'pastry', 'cake', 'dessert']},
    {'name': 'cake', 'keywords': ['cake', 'birthday', 'dessert', 'pastry']},
    {'name': 'icecream', 'keywords': ['ice cream', 'gelato', 'frozen', 'dessert']},
    {'name': 'breakfast_dining', 'keywords': ['breakfast', 'brunch', 'morning']},
    {'name': 'brunch_dining', 'keywords': ['brunch', 'breakfast', 'weekend']},
    {'name': 'lunch_dining', 'keywords': ['lunch', 'midday']},
    {'name': 'dinner_dining', 'keywords': ['dinner', 'evening', 'supper']},
    {'name': 'fastfood', 'keywords': ['fast food', 'burger', 'quick', 'takeout', 'takeaway']},
    {'name': 'kebab_dining', 'keywords': ['kebab', 'turkish', 'middle eastern', 'shawarma']},
    {'name': 'set_meal', 'keywords': ['sushi', 'japanese', 'asian', 'bento']},
    {'name': 'tapas', 'keywords': ['tapas', 'spanish', 'small plates']},
    {'name': 'egg', 'keywords': ['egg', 'breakfast', 'brunch']},
    {'name': 'rice_bowl', 'keywords': ['rice', 'bowl', 'asian', 'poke']},
    {'name': 'soup_kitchen', 'keywords': ['soup', 'stew', 'hot']},
    {'name': 'cookie', 'keywords': ['cookie', 'biscuit', 'sweet', 'snack']},
    {'name': 'nutrition', 'keywords': ['healthy', 'nutrition', 'diet', 'salad']},

    # Shopping & Services
    {'name': 'shopping_cart', 'keywords': ['shopping', 'grocery', 'supermarket', 'store', 'market']},
    {'name': 'shopping_bag', 'keywords': ['shop', 'retail', 'boutique', 'fashion', 'clothes']},
    {'name': 'storefront', 'keywords': ['store', 'shop', 'retail', 'business']},
    {'name': 'store', 'keywords': ['store', 'shop', 'retail']},
    {'name': 'local_mall', 'keywords': ['mall', 'shopping center', 'retail']},
    {'name': 'local_grocery_store', 'keywords': ['grocery', 'supermarket', 'food store']},
    {'name': 'local_pharmacy', 'keywords': ['pharmacy', 'drugstore', 'medicine', 'health']},
    {'name': 'local_florist', 'keywords': ['florist', 'flowers', 'plants', 'garden']},
    {'name': 'redeem', 'keywords': ['gift', 'present', 'gift shop']},
    {'name': 'checkroom', 'keywords': ['clothing', 'wardrobe', 'fashion']},
    {'name': 'dry_cleaning', 'keywords': ['dry cleaning', 'laundry', 'clothes']},
    {'name': 'content_cut', 'keywords': ['barber', 'haircut', 'salon', 'hairdresser']},
    {'name': 'face', 'keywords': ['beauty', 'facial', 'skincare']},
    {'name': 'spa', 'keywords': ['spa', 'wellness', 'massage', 'relaxation', 'beauty']},
    {'name': 'local_laundry_service', 'keywords': ['laundry', 'dry clean', 'washing']},
    {'name': 'local_gas_station', 'keywords': ['gas', 'petrol', 'fuel', 'station']},
    {'name': 'ev_station', 'keywords': ['electric', 'charging', 'ev', 'tesla']},
    {'name': 'local_car_wash', 'keywords': ['car wash', 'auto', 'cleaning']},
    {'name': 'hardware', 'keywords': ['hardware', 'tools', 'diy']},
    {'name': 'handyman', 'keywords': ['repair', 'fix', 'service', 'handyman']},
    {'name': 'plumbing', 'keywords': ['plumber', 'plumbing', 'pipes']},
    {'name': 'electrical_services', 'keywords': ['electrician', 'electrical', 'wiring']},
    {'name': 'construction', 'keywords': ['construction', 'building', 'contractor']},

    # Buildings & Places
    {'name': 'home', 'keywords': ['home', 'house', 'residence', 'apartment']},
    {'name': 'cottage', 'keywords': ['cottage', 'cabin', 'rural', 'vacation']},
    {'name': 'villa', 'keywords': ['villa', 'mansion', 'luxury home']},
    {'name': 'apartment', 'keywords': ['apartment', 'flat', 'building', 'residential']},
    {'name': 'domain', 'keywords': ['building', 'real estate', 'property']},
    {'name': 'business', 'keywords': ['office', 'work', 'business', 'corporate']},
    {'name': 'corporate_fare', 'keywords': ['corporate', 'headquarters', 'company']},
    {'name': 'factory', 'keywords': ['factory', 'industrial', 'manufacturing']},
    {'name': 'warehouse', 'keywords': ['warehouse', 'storage', 'industrial']},
    {'name': 'local_hospital', 'keywords': ['hospital', 'medical', 'clinic', 'health', 'doctor']},
    {'name': 'medical_services', 'keywords': ['medical', 'doctor', 'clinic', 'healthcare']},
    {'name': 'emergency', 'keywords': ['emergency', 'urgent', 'hospital']},
    {'name': 'vaccines', 'keywords': ['vaccine', 'pharmacy', 'health']},
    {'name': 'local_police', 'keywords': ['police', 'security', 'law enforcement']},
    {'name': 'school', 'keywords': ['school', 'education', 'learning', 'study']},
    {'name': 'science', 'keywords': ['science', 'lab', 'research']},
    {'name': 'biotech', 'keywords': ['biotech', 'laboratory', 'research']},
    {'name': 'account_balance', 'keywords': ['bank', 'finance', 'government', 'courthouse']},
    {'name': 'church', 'keywords': ['church', 'religious', 'worship', 'christian']},
    {'name': 'mosque', 'keywords': ['mosque', 'islamic', 'muslim', 'worship']},
    {'name': 'synagogue', 'keywords': ['synagogue', 'jewish', 'temple', 'worship']},
    {'name': 'temple_hindu', 'keywords': ['temple', 'hindu', 'worship']},
    {'name': 'temple_buddhist', 'keywords': ['temple', 'buddhist', 'worship']},
    {'name': 'museum', 'keywords': ['museum', 'gallery', 'art', 'exhibition', 'history']},
    {'name': 'local_library', 'keywords': ['library', 'books', 'reading']},
    {'name': 'hotel', 'keywords': ['hotel', 'accommodation', 'lodging', 'stay', 'motel']},
    {'name': 'bed', 'keywords': ['bed', 'sleep', 'hostel', 'accommodation']},
    {'name': 'holiday_village', 'keywords': ['resort', 'vacation', 'holiday']},
    {'name': 'chalet', 'keywords': ['chalet', 'ski', 'mountain lodge']},
    {'name': 'houseboat', 'keywords': ['houseboat', 'boat', 'water accommodation']},
    {'name': 'local_airport', 'keywords': ['airport', 'flight', 'travel', 'plane']},
    {'name': 'local_atm', 'keywords': ['atm', 'bank', 'cash', 'money']},
    {'name': 'local_post_office', 'keywords': ['post office', 'mail', 'shipping']},
    {'name': 'stadium', 'keywords': ['stadium', 'arena', 'sports venue']},
    {'name': 'fort', 'keywords': ['fort', 'castle', 'historical', 'fortress']},
    {'name': 'castle', 'keywords': ['castle', 'palace', 'historical']},

    # Entertainment & Culture
    {'name': 'theater_comedy', 'keywords': ['theater', 'theatre', 'comedy', 'show', 'performance']},
    {'name': 'theaters', 'keywords': ['theater', 'play', 'drama', 'performance']},
    {'name': 'movie', 'keywords': ['movie', 'cinema', 'film', 'theater']},
    {'name': 'live_tv', 'keywords': ['tv', 'broadcast', 'show']},
    {'name': 'music_note', 'keywords': ['music', 'concert', 'live', 'band', 'gig']},
    {'name': 'piano', 'keywords': ['piano', 'music', 'jazz', 'classical']},
    {'name': 'mic', 'keywords': ['microphone', 'karaoke', 'singing', 'performance']},
    {'name': 'headphones', 'keywords': ['headphones', 'audio', 'music', 'listening']},
    {'name': 'radio', 'keywords': ['radio', 'broadcast', 'music']},
    {'name': 'album', 'keywords': ['album', 'record', 'vinyl', 'music']},
    {'name': 'palette', 'keywords': ['art', 'gallery', 'creative', 'painting', 'exhibition']},
    {'name': 'brush', 'keywords': ['painting', 'art', 'creative']},
    {'name': 'draw', 'keywords': ['drawing', 'art', 'sketch']},
    {'name': 'photo_camera', 'keywords': ['photography', 'camera', 'photos']},
    {'name': 'videocam', 'keywords': ['video', 'film', 'recording']},
    {'name': 'menu_book', 'keywords': ['book', 'bookstore', 'reading', 'literature']},
    {'name': 'auto_stories', 'keywords': ['stories', 'books', 'reading']},
    {'name': 'nightlife', 'keywords': ['nightlife', 'club', 'nightclub', 'dancing', 'party']},
    {'name': 'casino', 'keywords': ['casino', 'gambling', 'gaming']},
    {'name': 'attractions', 'keywords': ['attraction', 'tourist', 'sightseeing', 'landmark']},
    {'name': 'festival', 'keywords': ['festival', 'event', 'fair', 'celebration']},
    {'name': 'celebration', 'keywords': ['celebration', 'party', 'event']},
    {'name': 'event', 'keywords': ['event', 'conference', 'meeting']},
    {'name': 'local_activity', 'keywords': ['activity', 'things to do', 'attraction']},
    {'name': 'confirmation_number', 'keywords': ['ticket', 'reservation', 'booking']},
    {'name': 'toys', 'keywords': ['toys', 'kids', 'play', 'games']},
    {'name': 'videogame_asset', 'keywords': ['games', 'arcade', 'gaming', 'video games']},
    {'name': 'sports_esports', 'keywords': ['esports', 'gaming', 'video games']},
    {'name': 'stadia_controller', 'keywords': ['gaming', 'controller', 'arcade']},
    {'name': 'bowling', 'keywords': ['bowling', 'games', 'recreation']},

    # Sports & Fitness
    {'name': 'fitness_center', 'keywords': ['gym', 'fitness', 'workout', 'exercise', 'training']},
    {'name': 'exercise', 'keywords': ['exercise', 'workout', 'training']},
    {'name': 'sports', 'keywords': ['sports', 'athletics', 'games']},
    {'name': 'sports_soccer', 'keywords': ['soccer', 'football', 'sport', 'field']},
    {'name': 'sports_football', 'keywords': ['american football', 'nfl', 'sport']},
    {'name': 'sports_basketball', 'keywords': ['basketball', 'court', 'sport', 'nba']},
    {'name': 'sports_baseball', 'keywords': ['baseball', 'mlb', 'sport']},
    {'name': 'sports_cricket', 'keywords': ['cricket', 'sport']},
    {'name': 'sports_hockey', 'keywords': ['hockey', 'ice hockey', 'nhl']},
    {'name': 'sports_rugby', 'keywords': ['rugby', 'sport']},
    {'name': 'sports_volleyball', 'keywords': ['volleyball', 'beach', 'sport']},
    {'name': 'sports_handball', 'keywords': ['handball', 'sport']},
    {'name': 'sports_tennis', 'keywords': ['tennis', 'court', 'racket']},
    {'name': 'sports_golf', 'keywords': ['golf', 'course', 'green']},
    {'name': 'golf_course', 'keywords': ['golf', 'course', 'green']},
    {'name': 'sports_martial_arts', 'keywords': ['martial arts', 'karate', 'judo', 'mma']},
    {'name': 'sports_gymnastics', 'keywords': ['gymnastics', 'acrobatics']},
    {'name': 'sports_mma', 'keywords': ['mma', 'fighting', 'ufc', 'boxing']},
    {'name': 'skateboarding', 'keywords': ['skateboard', 'skating', 'skate park']},
    {'name': 'snowboarding', 'keywords': ['snowboard', 'snow', 'winter sports']},
    {'name': 'downhill_skiing', 'keywords': ['skiing', 'ski', 'snow', 'winter']},
    {'name': 'sledding', 'keywords': ['sledding', 'snow', 'winter']},
    {'name': 'ice_skating', 'keywords': ['ice skating', 'rink', 'skating']},
    {'name': 'roller_skating', 'keywords': ['roller skating', 'skating', 'rink']},
    {'name': 'pool', 'keywords': ['pool', 'swimming', 'swim', 'aquatic']},
    {'name': 'surfing', 'keywords': ['surfing', 'surf', 'beach', 'waves']},
    {'name': 'kayaking', 'keywords': ['kayaking', 'kayak', 'water', 'paddle']},
    {'name': 'rowing', 'keywords': ['rowing', 'boat', 'water']},
    {'name': 'sailing', 'keywords': ['sailing', 'sail', 'boat', 'yacht']},
    {'name': 'kitesurfing', 'keywords': ['kitesurfing', 'kite', 'water sports']},
    {'name': 'scuba_diving', 'keywords': ['scuba', 'diving', 'underwater']},
    {'name': 'paragliding', 'keywords': ['paragliding', 'flying', 'adventure']},
    {'name': 'self_improvement', 'keywords': ['yoga', 'meditation', 'wellness', 'mindfulness']},
    {'name': 'hiking', 'keywords': ['hiking', 'trail', 'walk', 'trekking']},
    {'name': 'directions_walk', 'keywords': ['walking', 'pedestrian', 'stroll']},
    {'name': 'directions_run', 'keywords': ['running', 'jogging', 'marathon']},
    {'name': 'directions_bike', 'keywords': ['bike', 'cycling', 'bicycle']},
    {'name': 'pedal_bike', 'keywords': ['bicycle', 'bike', 'cycling']},
    {'name': 'electric_bike', 'keywords': ['e-bike', 'electric bicycle']},
    {'name': 'electric_scooter', 'keywords': ['e-scooter', 'scooter', 'electric']},
    {'name': 'two_wheeler', 'keywords': ['motorcycle', 'scooter', 'motorbike']},

    # Nature & Outdoors
    {'name': 'park', 'keywords': ['park', 'garden', 'green', 'outdoor', 'nature']},
    {'name': 'forest', 'keywords': ['forest', 'woods', 'trees', 'nature']},
    {'name': 'nature', 'keywords': ['nature', 'outdoors', 'environment']},
    {'name': 'grass', 'keywords': ['grass', 'lawn', 'field', 'meadow']},
    {'name': 'yard', 'keywords': ['yard', 'backyard', 'garden']},
    {'name': 'emoji_nature', 'keywords': ['nature', 'bug', 'insects', 'wildlife']},
    {'name': 'pets', 'keywords': ['pets', 'animals', 'dog', 'cat']},
    {'name': 'cruelty_free', 'keywords': ['animals', 'wildlife', 'rabbit']},
    {'name': 'beach_access', 'keywords': ['beach', 'sea', 'ocean', 'coast', 'shore']},
    {'name': 'waves', 'keywords': ['waves', 'ocean', 'sea', 'surf']},
    {'name': 'landscape', 'keywords': ['mountain', 'hill', 'landscape', 'scenic', 'view']},
    {'name': 'terrain', 'keywords': ['terrain', 'mountain', 'hiking']},
    {'name': 'filter_hdr', 'keywords': ['mountain', 'peaks', 'alps']},
    {'name': 'volcano', 'keywords': ['volcano', 'mountain', 'natural wonder']},
    {'name': 'camping', 'keywords': ['camping', 'camp', 'tent', 'outdoor']},
    {'name': 'cabin', 'keywords': ['cabin', 'lodge', 'woods']},
    {'name': 'water', 'keywords': ['water', 'lake', 'river', 'pond']},
    {'name': 'water_drop', 'keywords': ['water', 'fountain', 'spring']},
    {'name': 'air', 'keywords': ['air', 'wind', 'fresh']},
    {'name': 'sunny', 'keywords': ['sunny', 'sun', 'weather', 'clear']},
    {'name': 'cloud', 'keywords': ['cloud', 'cloudy', 'weather']},
    {'name': 'thunderstorm', 'keywords': ['storm', 'thunder', 'rain']},
    {'name': 'ac_unit', 'keywords': ['snow', 'cold', 'winter', 'ice']},

    # Transportation
    {'name': 'flight', 'keywords': ['flight', 'airplane', 'travel', 'airport']},
    {'name': 'flight_takeoff', 'keywords': ['departure', 'takeoff', 'flight']},
    {'name': 'flight_land', 'keywords': ['arrival', 'landing', 'flight']},
    {'name': 'connecting_airports', 'keywords': ['transit', 'connection', 'layover']},
    {'name': 'directions_car', 'keywords': ['car', 'drive', 'parking', 'auto']},
    {'name': 'local_taxi', 'keywords': ['taxi', 'cab', 'uber', 'lyft', 'ride']},
    {'name': 'car_rental', 'keywords': ['rental', 'car rental', 'rent a car']},
    {'name': 'electric_car', 'keywords': ['electric car', 'ev', 'tesla']},
    {'name': 'train', 'keywords': ['train', 'railway', 'station', 'metro', 'subway']},
    {'name': 'subway', 'keywords': ['subway', 'metro', 'underground']},
    {'name': 'tram', 'keywords': ['tram', 'streetcar', 'light rail']},
    {'name': 'directions_railway', 'keywords': ['railway', 'train', 'station']},
    {'name': 'directions_boat', 'keywords': ['boat', 'ferry', 'ship', 'port', 'marina']},
    {'name': 'cruise', 'keywords': ['cruise', 'ship', 'ocean']},
    {'name': 'directions_bus', 'keywords': ['bus', 'transit', 'public transport']},
    {'name': 'airport_shuttle', 'keywords': ['shuttle', 'airport', 'transport']},
    {'name': 'commute', 'keywords': ['commute', 'transit', 'transport']},
    {'name': 'rv_hookup', 'keywords': ['rv', 'camper', 'caravan', 'motorhome']},

    # General/Favorites
    {'name': 'star', 'keywords': ['favorite', 'best', 'top', 'starred', 'recommended']},
    {'name': 'star_rate', 'keywords': ['rating', 'review', 'stars']},
    {'name': 'favorite', 'keywords': ['love', 'heart', 'liked', 'favorite']},
    {'name': 'thumb_up', 'keywords': ['like', 'good', 'recommended']},
    {'name': 'sentiment_satisfied', 'keywords': ['happy', 'satisfied', 'good']},
    {'name': 'emoji_events', 'keywords': ['trophy', 'award', 'winner', 'best']},
    {'name': 'workspace_premium', 'keywords': ['premium', 'award', 'quality']},
    {'name': 'military_tech', 'keywords': ['award', 'medal', 'achievement']},
    {'name': 'diamond', 'keywords': ['premium', 'luxury', 'special', 'exclusive']},
    {'name': 'flag', 'keywords': ['flag', 'marker', 'important', 'noted']},
    {'name': 'bookmark', 'keywords': ['saved', 'bookmark', 'later', 'remember']},
    {'name': 'label', 'keywords': ['label', 'tag', 'category']},
    {'name': 'pin_drop', 'keywords': ['location', 'place', 'spot', 'point']},
    {'name': 'place', 'keywords': ['place', 'location', 'map']},
    {'name': 'explore', 'keywords': ['explore', 'discover', 'adventure', 'new']},
    {'name': 'travel_explore', 'keywords': ['travel', 'explore', 'world']},
    {'name': 'public', 'keywords': ['public', 'world', 'global']},
    {'name': 'language', 'keywords': ['language', 'international', 'global']},
    {'name': 'rocket_launch', 'keywords': ['rocket', 'launch', 'startup', 'new']},
    {'name': 'trending_up', 'keywords': ['trending', 'popular', 'rising']},
    {'name': 'whatshot', 'keywords': ['hot', 'trending', 'popular', 'fire']},
    {'name': 'bolt', 'keywords': ['fast', 'quick', 'lightning', 'electric']},
    {'name': 'flash_on', 'keywords': ['flash', 'quick', 'instant']},
    {'name': 'local_fire_department', 'keywords': ['hot', 'fire', 'trending', 'popular']},

    # Attributes/Tags
    {'name': 'family_restroom', 'keywords': ['family', 'kid', 'child', 'children', 'friendly']},
    {'name': 'child_care', 'keywords': ['childcare', 'kids', 'children', 'daycare']},
    {'name': 'child_friendly', 'keywords': ['kid friendly', 'children', 'family']},
    {'name': 'elderly', 'keywords': ['elderly', 'senior', 'accessible']},
    {'name': 'pregnant_woman', 'keywords': ['maternity', 'pregnancy', 'baby']},
    {'name': 'stroller', 'keywords': ['stroller', 'baby', 'kids']},
    {'name': 'accessible', 'keywords': ['accessible', 'wheelchair', 'disability']},
    {'name': 'accessible_forward', 'keywords': ['wheelchair', 'accessible', 'mobility']},
    {'name': 'blind', 'keywords': ['blind', 'visually impaired', 'accessible']},
    {'name': 'hearing', 'keywords': ['hearing', 'deaf', 'accessible']},
    {'name': 'wifi', 'keywords': ['wifi', 'internet', 'wireless', 'connected']},
    {'name': 'signal_wifi_4_bar', 'keywords': ['wifi', 'signal', 'connection']},
    {'name': 'bluetooth', 'keywords': ['bluetooth', 'wireless', 'connect']},
    {'name': 'power', 'keywords': ['power', 'outlet', 'charging']},
    {'name': 'local_parking', 'keywords': ['parking', 'park', 'car']},
    {'name': 'garage', 'keywords': ['garage', 'parking', 'covered']},
    {'name': 'deck', 'keywords': ['outdoor', 'patio', 'terrace', 'seating', 'rooftop']},
    {'name': 'balcony', 'keywords': ['balcony', 'outdoor', 'terrace']},
    {'name': 'roofing', 'keywords': ['rooftop', 'roof', 'terrace']},
    {'name': 'mood', 'keywords': ['romantic', 'date', 'cozy', 'intimate']},
    {'name': 'nightlight', 'keywords': ['romantic', 'candle', 'cozy', 'ambiance']},
    {'name': 'groups', 'keywords': ['group', 'party', 'gathering', 'event', 'social']},
    {'name': 'diversity_3', 'keywords': ['diverse', 'inclusive', 'community']},
    {'name': 'handshake', 'keywords': ['business', 'meeting', 'deal']},
    {'name': 'eco', 'keywords': ['eco', 'green', 'sustainable', 'organic', 'vegan', 'vegetarian']},
    {'name': 'compost', 'keywords': ['compost', 'organic', 'eco']},
    {'name': 'recycling', 'keywords': ['recycling', 'eco', 'green']},
    {'name': 'energy_savings_leaf', 'keywords': ['eco', 'green', 'sustainable']},
    {'name': 'payments', 'keywords': ['cheap', 'affordable', 'budget', 'inexpensive']},
    {'name': 'savings', 'keywords': ['savings', 'budget', 'cheap']},
    {'name': 'attach_money', 'keywords': ['expensive', 'pricey', 'upscale', 'fancy']},
    {'name': 'currency_exchange', 'keywords': ['exchange', 'currency', 'money']},
    {'name': 'credit_card', 'keywords': ['credit card', 'payment', 'card']},
    {'name': 'contactless', 'keywords': ['contactless', 'payment', 'tap']},
    {'name': 'schedule', 'keywords': ['late', 'night', 'open', 'hours', '24h']},
    {'name': 'access_time', 'keywords': ['time', 'hours', 'schedule']},
    {'name': 'event_available', 'keywords': ['available', 'open', 'booking']},
    {'name': 'event_busy', 'keywords': ['busy', 'crowded', 'full']},
    {'name': 'verified', 'keywords': ['verified', 'trusted', 'recommended', 'approved']},
    {'name': 'new_releases', 'keywords': ['new', 'recent', 'fresh', 'latest']},
    {'name': 'update', 'keywords': ['updated', 'recent', 'changed']},
    {'name': 'history', 'keywords': ['historic', 'old', 'heritage', 'ancient']},
    {'name': 'lock', 'keywords': ['private', 'secure', 'locked', 'exclusive']},
    {'name': 'lock_open', 'keywords': ['open', 'public', 'free']},
    {'name': 'visibility', 'keywords': ['view', 'scenic', 'vista', 'panorama']},
    {'name': 'camera_enhance', 'keywords': ['photo spot', 'photography', 'scenic']},
    {'name': 'volume_up', 'keywords': ['loud', 'noisy', 'music']},
    {'name': 'volume_off', 'keywords': ['quiet', 'silent', 'peaceful']},
    {'name': 'smoke_free', 'keywords': ['no smoking', 'smoke free']},
    {'name': 'smoking_rooms', 'keywords': ['smoking', 'smoker']},
    {'name': 'no_drinks', 'keywords': ['no alcohol', 'dry']},
    {'name': 'no_food', 'keywords': ['no food', 'no eating']},
    {'name': 'wc', 'keywords': ['toilet', 'bathroom', 'restroom', 'wc']},
    {'name': 'baby_changing_station', 'keywords': ['baby', 'changing', 'diaper']},
    {'name': 'shower', 'keywords': ['shower', 'bathroom', 'wash']},
    {'name': 'bathtub', 'keywords': ['bath', 'bathtub', 'spa']},
    {'name': 'hot_tub', 'keywords': ['hot tub', 'jacuzzi', 'spa']},
    {'name': 'fireplace', 'keywords': ['fireplace', 'cozy', 'warm']},
    {'name': 'kitchen', 'keywords': ['kitchen', 'cooking', 'chef']},
    {'name': 'countertops', 'keywords': ['bar', 'counter', 'seating']},
    {'name': 'chair', 'keywords': ['seating', 'sit', 'chair']},
    {'name': 'table_restaurant', 'keywords': ['table', 'dining', 'seating']},
    {'name': 'meeting_room', 'keywords': ['meeting', 'conference', 'business']},
    {'name': 'co_present', 'keywords': ['coworking', 'shared', 'workspace']},
]


def get_random_tag_color() -> str:
    """Get a random color from the palette using secure random"""
    return secrets.choice(TAG_COLORS)


def _string_similarity(str1: str, str2: str) -> float:
    """Calculate similarity between two strings (case-insensitive)"""
    s1 = str1.lower()
    s2 = str2.lower()

    # Exact match
    if s1 == s2:
        return 1.0

    # One contains the other
    if s1 in s2 or s2 in s1:
        return 0.9

    # Calculate Levenshtein distance
    len1 = len(s1)
    len2 = len(s2)
    max_len = max(len1, len2)

    if max_len == 0:
        return 1.0

    # Create matrix
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]

    for i in range(len1 + 1):
        matrix[i][0] = i
    for j in range(len2 + 1):
        matrix[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            matrix[i][j] = min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            )

    return 1.0 - matrix[len1][len2] / max_len


def suggest_icon_for_tag(tag_name: str) -> str | None:
    """Suggest an icon based on tag name (returns icon name if match >= 90%)"""
    normalized_name = tag_name.lower().strip()

    best_match = None
    best_score = 0.0

    for icon_def in MATERIAL_ICONS:
        # Check against icon name
        score = _string_similarity(normalized_name, icon_def['name'].replace('_', ' '))

        # Check against keywords
        for keyword in icon_def['keywords']:
            keyword_score = _string_similarity(normalized_name, keyword)
            if keyword_score > score:
                score = keyword_score

            # Also check if tag name contains keyword or vice versa
            if normalized_name in keyword or keyword in normalized_name:
                score = max(score, 0.9)

        if score > best_score:
            best_score = score
            best_match = icon_def['name']

    # Return icon if match is >= 90%
    if best_match and best_score >= 0.9:
        return best_match

    return None
