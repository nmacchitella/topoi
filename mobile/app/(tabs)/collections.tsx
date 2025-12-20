import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import type { ListWithPlaceCount, TagWithUsage } from '../../src/types';

type TabType = 'collections' | 'tags';

export default function CollectionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('collections');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { lists, tags, fetchLists, fetchTags, isInitialized } = useStore();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchLists(), fetchTags()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderCollectionItem = ({ item }: { item: ListWithPlaceCount }) => (
    <Pressable
      style={styles.itemCard}
      onPress={() => {
        // TODO: Navigate to collection detail
      }}
    >
      <View style={[styles.itemIcon, { backgroundColor: item.color + '33' }]}>
        <Ionicons name="folder" size={24} color={item.color} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCount}>
          {item.place_count} {item.place_count === 1 ? 'place' : 'places'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#737373" />
    </Pressable>
  );

  const renderTagItem = ({ item }: { item: TagWithUsage }) => (
    <Pressable
      style={styles.itemCard}
      onPress={() => {
        // TODO: Navigate to tag detail
      }}
    >
      <View style={[styles.itemIcon, { backgroundColor: item.color + '33' }]}>
        {item.icon ? (
          <Text style={[styles.materialIcon, { color: item.color }]}>
            {item.icon}
          </Text>
        ) : (
          <Ionicons name="pricetag" size={20} color={item.color} />
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCount}>
          {item.usage_count} {item.usage_count === 1 ? 'place' : 'places'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#737373" />
    </Pressable>
  );

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'collections' && styles.activeTab]}
          onPress={() => setActiveTab('collections')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'collections' && styles.activeTabText,
            ]}
          >
            Collections
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'tags' && styles.activeTab]}
          onPress={() => setActiveTab('tags')}
        >
          <Text
            style={[styles.tabText, activeTab === 'tags' && styles.activeTabText]}
          >
            Tags
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === 'collections' ? (
        <FlatList
          data={lists}
          renderItem={renderCollectionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DE7356"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color="#737373" />
              <Text style={styles.emptyText}>No collections yet</Text>
              <Text style={styles.emptySubtext}>
                Create a collection to organize your places
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={tags}
          renderItem={renderTagItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DE7356"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={64} color="#737373" />
              <Text style={styles.emptyText}>No tags yet</Text>
              <Text style={styles.emptySubtext}>
                Add tags to your places to categorize them
              </Text>
            </View>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3a3a38',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#DE7356',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  activeTabText: {
    color: '#faf9f5',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialIcon: {
    fontSize: 20,
    fontFamily: 'System',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  itemCount: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
    textAlign: 'center',
  },
});
