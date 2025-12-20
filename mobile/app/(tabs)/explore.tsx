import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { exploreApi, usersApi, TopPlace } from '../../src/lib/api';
import type { UserSearchResult } from '../../src/types';

export default function ExploreScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [topUsers, setTopUsers] = useState<UserSearchResult[]>([]);
  const [topPlaces, setTopPlaces] = useState<TopPlace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchData = async () => {
    try {
      const [users, places] = await Promise.all([
        exploreApi.getTopUsers(10),
        exploreApi.getTopPlaces(undefined, undefined, 10),
      ]);
      setTopUsers(users);
      setTopPlaces(places);
    } catch (error) {
      console.error('Failed to fetch explore data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await usersApi.search(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <Pressable
      style={styles.userCard}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <View style={styles.userAvatar}>
        <Ionicons name="person" size={24} color="#a3a3a3" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.username && (
          <Text style={styles.userUsername}>@{item.username}</Text>
        )}
        {item.place_count !== undefined && (
          <Text style={styles.userPlaces}>{item.place_count} places</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#737373" />
    </Pressable>
  );

  const renderPlaceItem = ({ item }: { item: TopPlace }) => (
    <Pressable
      style={styles.placeCard}
      onPress={() => router.push(`/place/${item.id}`)}
    >
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{item.name}</Text>
        <Text style={styles.placeAddress} numberOfLines={1}>
          {item.address}
        </Text>
        {item.owner && (
          <Text style={styles.placeOwner}>
            by {item.owner.name}
          </Text>
        )}
      </View>
      <View style={styles.placeStats}>
        <Ionicons name="people" size={14} color="#a3a3a3" />
        <Text style={styles.placeCount}>{item.user_count}</Text>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#737373" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#737373"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#737373" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          {isSearching ? (
            <ActivityIndicator size="small" color="#DE7356" />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No users found</Text>
          )}
        </View>
      )}

      {/* Main Content */}
      {searchQuery.length < 2 && (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DE7356"
            />
          }
          ListHeaderComponent={
            <>
              {/* Top Users Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Popular Users</Text>
                {topUsers.length > 0 ? (
                  topUsers.map((user) => (
                    <Pressable
                      key={user.id}
                      style={styles.userCard}
                      onPress={() => router.push(`/user/${user.id}`)}
                    >
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={24} color="#a3a3a3" />
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        {user.username && (
                          <Text style={styles.userUsername}>@{user.username}</Text>
                        )}
                        {user.place_count !== undefined && (
                          <Text style={styles.userPlaces}>{user.place_count} places</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#737373" />
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No users yet</Text>
                )}
              </View>

              {/* Top Places Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Popular Places</Text>
                {topPlaces.length > 0 ? (
                  topPlaces.map((place) => (
                    <Pressable
                      key={place.id}
                      style={styles.placeCard}
                      onPress={() => router.push(`/place/${place.id}`)}
                    >
                      <View style={styles.placeInfo}>
                        <Text style={styles.placeName}>{place.name}</Text>
                        <Text style={styles.placeAddress} numberOfLines={1}>
                          {place.address}
                        </Text>
                        {place.owner && (
                          <Text style={styles.placeOwner}>
                            by {place.owner.name}
                          </Text>
                        )}
                      </View>
                      <View style={styles.placeStats}>
                        <Ionicons name="people" size={14} color="#a3a3a3" />
                        <Text style={styles.placeCount}>{place.user_count}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No places yet</Text>
                )}
              </View>
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252523',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252523',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: '#faf9f5',
    fontSize: 16,
    marginLeft: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4a4a48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  userUsername: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  userPlaces: {
    fontSize: 12,
    color: '#DE7356',
    marginTop: 2,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  placeAddress: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  placeOwner: {
    fontSize: 12,
    color: '#DE7356',
    marginTop: 2,
  },
  placeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  placeCount: {
    fontSize: 12,
    color: '#a3a3a3',
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
